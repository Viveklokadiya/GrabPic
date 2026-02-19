from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import requests

from app.config import Settings

logger = logging.getLogger(__name__)

YUNET_MODEL_FILE = "face_detection_yunet_2023mar.onnx"
SFACE_MODEL_FILE = "face_recognition_sface_2021dec.onnx"
YUNET_MODEL_URL = (
    "https://github.com/opencv/opencv_zoo/blob/main/models/face_detection_yunet/"
    "face_detection_yunet_2023mar.onnx?raw=true"
)
SFACE_MODEL_URL = (
    "https://github.com/opencv/opencv_zoo/blob/main/models/face_recognition_sface/"
    "face_recognition_sface_2021dec.onnx?raw=true"
)


@dataclass
class FaceEmbedding:
    embedding: list[float]
    area_ratio: float
    det_confidence: float
    sharpness: float
    bbox: tuple[float, float, float, float]


def _normalize(vec: np.ndarray) -> np.ndarray | None:
    norm = float(np.linalg.norm(vec))
    if norm <= 0:
        return None
    return vec / norm


class FaceEngine:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._detector: cv2.FaceDetectorYN | None = None
        self._recognizer: cv2.FaceRecognizerSF | None = None
        self._init_error: str = ""

    def embed_faces(self, image_bytes: bytes, max_faces: int = 12) -> list[FaceEmbedding]:
        image = self._decode_image(image_bytes)
        if image is None:
            return []

        detector, recognizer = self._ensure_models_loaded()
        if detector is None or recognizer is None:
            if self.settings.enable_ml_fallback:
                return [self._fallback_face(image)]
            return []

        resized = self._resize_for_inference(image, self.settings.face_resize_max_side)
        faces = self._detect_faces(
            image=resized,
            detector=detector,
            min_face_ratio=float(self.settings.face_min_face_ratio),
            max_faces=max(1, min(int(max_faces), int(self.settings.face_max_faces_per_image))),
        )

        out: list[FaceEmbedding] = []
        for face, conf, area_ratio in faces:
            sharpness = self._face_sharpness(resized, face)
            if sharpness < float(self.settings.face_min_sharpness):
                continue
            feature = self._face_feature(resized, face, recognizer)
            if feature is None:
                continue
            x, y, w, h = [float(v) for v in face[:4]]
            out.append(
                FaceEmbedding(
                    embedding=[round(float(v), 7) for v in feature.tolist()],
                    area_ratio=float(area_ratio),
                    det_confidence=float(conf),
                    sharpness=float(sharpness),
                    bbox=(x, y, w, h),
                )
            )
        return out

    def embed_single_face(self, image_bytes: bytes) -> list[float] | None:
        faces = self.embed_faces(image_bytes=image_bytes, max_faces=8)
        if not faces:
            return None
        faces.sort(key=lambda item: (item.area_ratio, item.det_confidence), reverse=True)
        return faces[0].embedding

    def _ensure_models_loaded(self) -> tuple[cv2.FaceDetectorYN | None, cv2.FaceRecognizerSF | None]:
        if self._detector is not None and self._recognizer is not None:
            return self._detector, self._recognizer
        if self._init_error:
            return None, None

        try:
            cache_dir = self.settings.face_model_cache_dir_path
            cache_dir.mkdir(parents=True, exist_ok=True)
            yunet_path = cache_dir / YUNET_MODEL_FILE
            sface_path = cache_dir / SFACE_MODEL_FILE
            self._download_if_missing(yunet_path, YUNET_MODEL_URL, min_bytes=100_000)
            self._download_if_missing(sface_path, SFACE_MODEL_URL, min_bytes=5_000_000)

            detector = cv2.FaceDetectorYN.create(
                str(yunet_path),
                "",
                (int(self.settings.face_det_size), int(self.settings.face_det_size)),
                float(self.settings.face_det_score_threshold),
                0.3,
                5000,
            )
            recognizer = cv2.FaceRecognizerSF.create(str(sface_path), "")
            if detector is None or recognizer is None:
                raise RuntimeError("Failed to initialize YuNet/SFace models")

            self._detector = detector
            self._recognizer = recognizer
            return detector, recognizer
        except Exception as exc:
            self._init_error = str(exc)
            logger.warning("YuNet/SFace init failed; fallback enabled=%s; error=%s", self.settings.enable_ml_fallback, exc)
            return None, None

    def _download_if_missing(self, model_path: Path, model_url: str, min_bytes: int) -> None:
        if model_path.exists() and model_path.stat().st_size >= min_bytes:
            return
        tmp_path = model_path.with_suffix(model_path.suffix + ".tmp")
        response = requests.get(model_url, timeout=180, stream=True)
        if response.status_code != 200:
            raise RuntimeError(f"Model download failed ({response.status_code}) for {model_path.name}")
        with tmp_path.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 512):
                if chunk:
                    handle.write(chunk)
        if tmp_path.stat().st_size < min_bytes:
            tmp_path.unlink(missing_ok=True)
            raise RuntimeError(f"Downloaded model file is incomplete for {model_path.name}")
        tmp_path.replace(model_path)

    def _decode_image(self, image_bytes: bytes) -> np.ndarray | None:
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        if arr.size == 0:
            return None
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)

    def _resize_for_inference(self, image: np.ndarray, max_side: int) -> np.ndarray:
        if max_side <= 0:
            return image
        h, w = image.shape[:2]
        long_side = max(h, w)
        if long_side <= max_side:
            return image
        scale = float(max_side) / float(long_side)
        new_w = max(1, int(round(w * scale)))
        new_h = max(1, int(round(h * scale)))
        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

    def _detect_faces(
        self,
        *,
        image: np.ndarray,
        detector: cv2.FaceDetectorYN,
        min_face_ratio: float,
        max_faces: int,
    ) -> list[tuple[np.ndarray, float, float]]:
        image_h, image_w = image.shape[:2]
        if image_h < 2 or image_w < 2:
            return []
        detector.setInputSize((image_w, image_h))
        _ok, faces = detector.detect(image)
        if faces is None or len(faces) == 0:
            return []

        image_area = float(image_h * image_w)
        candidates: list[tuple[np.ndarray, float, float]] = []
        for face in faces:
            x, y, w, h = [float(v) for v in face[:4]]
            if w <= 1 or h <= 1:
                continue
            area_ratio = (w * h) / image_area
            if area_ratio < min_face_ratio:
                continue
            det_conf = float(face[14]) if len(face) > 14 else 0.0
            candidates.append((face.astype(np.float32), det_conf, area_ratio))

        candidates.sort(key=lambda item: (item[2], item[1]), reverse=True)
        return candidates[: max(1, int(max_faces))]

    def _face_sharpness(self, image: np.ndarray, face: np.ndarray) -> float:
        x, y, w, h = [float(v) for v in face[:4]]
        x1 = max(0, int(math.floor(x)))
        y1 = max(0, int(math.floor(y)))
        x2 = min(image.shape[1], int(math.ceil(x + w)))
        y2 = min(image.shape[0], int(math.ceil(y + h)))
        if x2 <= x1 or y2 <= y1:
            return 0.0
        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            return 0.0
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    def _face_feature(self, image: np.ndarray, face: np.ndarray, recognizer: cv2.FaceRecognizerSF) -> np.ndarray | None:
        aligned = recognizer.alignCrop(image, face)
        if aligned is None or aligned.size == 0:
            return None
        feature = recognizer.feature(aligned)
        if feature is None:
            return None
        vec = np.asarray(feature, dtype=np.float32).reshape(-1)
        # SFace commonly returns 128-D vectors; pad to DB vector size (512) for schema consistency.
        if vec.size < 512:
            vec = np.pad(vec, (0, 512 - vec.size), mode="constant")
        elif vec.size > 512:
            vec = vec[:512]
        normalized = _normalize(vec)
        return normalized

    def _fallback_face(self, image: np.ndarray) -> FaceEmbedding:
        h, w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        small = cv2.resize(gray, (32, 16), interpolation=cv2.INTER_AREA).astype(np.float32).reshape(-1)
        if small.size < 512:
            small = np.pad(small, (0, 512 - small.size), mode="constant")
        vec = small[:512]
        normalized = _normalize(vec)
        vector = normalized.tolist() if normalized is not None else [0.0] * 512
        return FaceEmbedding(
            embedding=[float(v) for v in vector],
            area_ratio=1.0,
            det_confidence=0.0,
            sharpness=float(cv2.Laplacian(gray, cv2.CV_64F).var()),
            bbox=(0.0, 0.0, float(w), float(h)),
        )
