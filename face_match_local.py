#!/usr/bin/env python3
import argparse
from collections import deque
import json
import math
import os
import random
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

try:
    import psycopg2
    from psycopg2.extras import execute_values
except Exception:  # pragma: no cover - optional dependency at runtime
    psycopg2 = None
    execute_values = None

DRIVE_LIST_URL = 'https://www.googleapis.com/drive/v3/files'
DRIVE_MEDIA_URL = 'https://www.googleapis.com/drive/v3/files/{file_id}'
DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder'

MODEL_CACHE_DIR = Path(os.environ.get('FACE_MODEL_CACHE_DIR', '~/.cache/drive-face-models')).expanduser()
DEFAULT_METADATA_CACHE_DIR = Path(os.environ.get('FACE_METADATA_CACHE_DIR', '~/.cache/drive-face-index')).expanduser()
YUNET_MODEL_FILE = 'face_detection_yunet_2023mar.onnx'
SFACE_MODEL_FILE = 'face_recognition_sface_2021dec.onnx'
YUNET_MODEL_URL = (
    'https://github.com/opencv/opencv_zoo/blob/main/models/face_detection_yunet/'
    'face_detection_yunet_2023mar.onnx?raw=true'
)
SFACE_MODEL_URL = (
    'https://github.com/opencv/opencv_zoo/blob/main/models/face_recognition_sface/'
    'face_recognition_sface_2021dec.onnx?raw=true'
)

# Calibrated mapping for SFace cosine outputs.
COSINE_MAP_FLOOR = 0.15
COSINE_MAP_SPAN = 0.37

DEFAULT_DET_SIZE = int(os.environ.get('FACE_DET_SIZE', '640'))
DEFAULT_DET_SCORE = float(os.environ.get('FACE_DET_SCORE_THRESHOLD', '0.88'))
DEFAULT_MIN_FACE_RATIO = float(os.environ.get('FACE_MIN_FACE_RATIO', '0.015'))
DEFAULT_MIN_SHARPNESS = float(os.environ.get('FACE_MIN_SHARPNESS', '35.0'))
DEFAULT_MAX_FACES_PER_IMAGE = int(os.environ.get('FACE_MAX_FACES_PER_IMAGE', '6'))
DEFAULT_RESIZE_MAX_SIDE = int(os.environ.get('FACE_RESIZE_MAX_SIDE', '1600'))
DEFAULT_TOP_MARGIN = float(os.environ.get('FACE_TOP_MARGIN', '8.0'))
DEFAULT_AUTO_RELAX_DROP = float(os.environ.get('FACE_AUTO_RELAX_DROP', '10.0'))
DEFAULT_AUTO_RELAX_MIN_THRESHOLD = float(os.environ.get('FACE_AUTO_RELAX_MIN_THRESHOLD', '78.0'))
DEFAULT_DOWNLOAD_DELAY_MS = int(os.environ.get('DRIVE_DOWNLOAD_DELAY_MS', '180'))
DEFAULT_MAX_CONSECUTIVE_DOWNLOAD_ERRORS = int(os.environ.get('DRIVE_MAX_CONSECUTIVE_DOWNLOAD_ERRORS', '8'))
DEFAULT_SCAN_TIME_LIMIT_SEC = int(os.environ.get('FACE_SCAN_TIME_LIMIT_SEC', '210'))
DEFAULT_PREFER_PUBLIC_DOWNLOAD = str(os.environ.get('DRIVE_PREFER_PUBLIC_DOWNLOAD', 'true')).lower() in (
    '1',
    'true',
    'yes',
    'on',
)
DEFAULT_SMALL_FACE_REF_RATIO = float(os.environ.get('FACE_SMALL_FACE_REF_RATIO', '0.003'))
DEFAULT_SMALL_FACE_MIN_RATIO = float(os.environ.get('FACE_SMALL_FACE_MIN_RATIO', '0.0006'))
DEFAULT_SMALL_FACE_THRESHOLD_DROP = float(os.environ.get('FACE_SMALL_FACE_THRESHOLD_DROP', '12.0'))
DEFAULT_BEST_EFFORT_MIN_SIMILARITY = float(os.environ.get('FACE_BEST_EFFORT_MIN_SIMILARITY', '58.0'))
DEFAULT_BEST_EFFORT_MIN_GAP = float(os.environ.get('FACE_BEST_EFFORT_MIN_GAP', '2.8'))
DEFAULT_BEST_EFFORT_MAX_RESULTS = int(os.environ.get('FACE_BEST_EFFORT_MAX_RESULTS', '2'))
DEFAULT_REF_DET_SIZE = int(os.environ.get('FACE_REF_DET_SIZE', str(max(DEFAULT_DET_SIZE, 800))))
DEFAULT_REF_DET_SCORE = float(os.environ.get('FACE_REF_DET_SCORE_THRESHOLD', str(min(0.82, DEFAULT_DET_SCORE))))
DEFAULT_REF_MIN_FACE_RATIO = float(
    os.environ.get('FACE_REF_MIN_FACE_RATIO', str(max(0.004, DEFAULT_MIN_FACE_RATIO * 0.35)))
)
DEFAULT_REF_MIN_SHARPNESS = float(
    os.environ.get('FACE_REF_MIN_SHARPNESS', str(max(12.0, DEFAULT_MIN_SHARPNESS * 0.5)))
)
DEFAULT_VECTOR_BACKEND = str(os.environ.get('FACE_VECTOR_BACKEND', 'file')).strip().lower()
DEFAULT_PGVECTOR_DSN = str(os.environ.get('FACE_PGVECTOR_DSN', '')).strip()
DEFAULT_PGVECTOR_SCHEMA = str(os.environ.get('FACE_PGVECTOR_SCHEMA', 'public')).strip() or 'public'
DEFAULT_PGVECTOR_TABLE_PREFIX = str(os.environ.get('FACE_PGVECTOR_TABLE_PREFIX', 'drive_face')).strip() or 'drive_face'


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Local face matching from Google Drive using OpenCV YuNet + SFace embeddings')
    parser.add_argument('--folder-id', required=True, help='Google Drive folder id')
    parser.add_argument('--google-api-key', required=True, help='Google API key with Drive API enabled')
    parser.add_argument('--reference-image', required=True, help='Path to reference image file')
    parser.add_argument('--max-images', type=int, default=80, help='Maximum number of folder images to scan (0 = no limit)')
    parser.add_argument('--threshold', type=float, default=90.0, help='Similarity threshold (0-100)')
    parser.add_argument('--det-size', type=int, default=DEFAULT_DET_SIZE, help='Face detector input size')
    parser.add_argument('--det-score-threshold', type=float, default=DEFAULT_DET_SCORE, help='Face detector minimum confidence')
    parser.add_argument('--min-face-ratio', type=float, default=DEFAULT_MIN_FACE_RATIO, help='Minimum face area ratio inside image')
    parser.add_argument('--min-sharpness', type=float, default=DEFAULT_MIN_SHARPNESS, help='Minimum Laplacian sharpness score for candidate faces')
    parser.add_argument('--ref-det-size', type=int, default=DEFAULT_REF_DET_SIZE, help='Reference face detector input size')
    parser.add_argument(
        '--ref-det-score-threshold',
        type=float,
        default=DEFAULT_REF_DET_SCORE,
        help='Reference image detector minimum confidence',
    )
    parser.add_argument(
        '--ref-min-face-ratio',
        type=float,
        default=DEFAULT_REF_MIN_FACE_RATIO,
        help='Minimum face area ratio inside the reference image',
    )
    parser.add_argument(
        '--ref-min-sharpness',
        type=float,
        default=DEFAULT_REF_MIN_SHARPNESS,
        help='Minimum Laplacian sharpness score for reference face',
    )
    parser.add_argument('--max-faces-per-image', type=int, default=DEFAULT_MAX_FACES_PER_IMAGE, help='Maximum detected faces processed per image')
    parser.add_argument('--resize-max-side', type=int, default=DEFAULT_RESIZE_MAX_SIDE, help='Resize large images to this max side before inference')
    parser.add_argument('--top-margin', type=float, default=DEFAULT_TOP_MARGIN, help='Keep matches within this similarity margin from best match')
    parser.add_argument(
        '--small-face-ref-ratio',
        type=float,
        default=DEFAULT_SMALL_FACE_REF_RATIO,
        help='Face area ratio below this starts lowering threshold for group photos',
    )
    parser.add_argument(
        '--small-face-min-ratio',
        type=float,
        default=DEFAULT_SMALL_FACE_MIN_RATIO,
        help='Smallest face area ratio considered for adaptive threshold drop',
    )
    parser.add_argument(
        '--small-face-threshold-drop',
        type=float,
        default=DEFAULT_SMALL_FACE_THRESHOLD_DROP,
        help='Maximum threshold drop for very small faces in group photos',
    )
    parser.add_argument(
        '--best-effort-min-similarity',
        type=float,
        default=DEFAULT_BEST_EFFORT_MIN_SIMILARITY,
        help='Low-confidence fallback minimum similarity when no matches found',
    )
    parser.add_argument(
        '--best-effort-min-gap',
        type=float,
        default=DEFAULT_BEST_EFFORT_MIN_GAP,
        help='Top-vs-second similarity gap required for low-confidence fallback',
    )
    parser.add_argument(
        '--best-effort-max-results',
        type=int,
        default=DEFAULT_BEST_EFFORT_MAX_RESULTS,
        help='Maximum low-confidence fallback results when no strong matches exist',
    )
    parser.add_argument(
        '--auto-relax-drop',
        type=float,
        default=DEFAULT_AUTO_RELAX_DROP,
        help='If strict threshold finds 0 matches, lower by this amount and retry selection',
    )
    parser.add_argument(
        '--auto-relax-min-threshold',
        type=float,
        default=DEFAULT_AUTO_RELAX_MIN_THRESHOLD,
        help='Lower bound for adaptive fallback threshold',
    )
    parser.add_argument('--download-delay-ms', type=int, default=DEFAULT_DOWNLOAD_DELAY_MS, help='Delay between Drive downloads')
    parser.add_argument(
        '--max-consecutive-download-errors',
        type=int,
        default=DEFAULT_MAX_CONSECUTIVE_DOWNLOAD_ERRORS,
        help='Stop early when too many downloads fail back-to-back',
    )
    parser.add_argument(
        '--scan-time-limit-sec',
        type=int,
        default=DEFAULT_SCAN_TIME_LIMIT_SEC,
        help='Maximum scan runtime in seconds before early stop (0 = no limit)',
    )
    parser.add_argument(
        '--metadata-cache-dir',
        default=str(DEFAULT_METADATA_CACHE_DIR),
        help='Directory for cached per-folder face embeddings metadata',
    )
    parser.add_argument(
        '--vector-backend',
        default=DEFAULT_VECTOR_BACKEND,
        choices=['file', 'pgvector'],
        help='Embedding cache backend: local file cache or pgvector',
    )
    parser.add_argument(
        '--pgvector-dsn',
        default=DEFAULT_PGVECTOR_DSN,
        help='PostgreSQL DSN for pgvector backend',
    )
    parser.add_argument(
        '--pgvector-schema',
        default=DEFAULT_PGVECTOR_SCHEMA,
        help='Target schema for pgvector tables',
    )
    parser.add_argument(
        '--pgvector-table-prefix',
        default=DEFAULT_PGVECTOR_TABLE_PREFIX,
        help='Table prefix for pgvector tables',
    )
    return parser.parse_args()


def build_http_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=0.8,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=frozenset(['GET']),
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)
    session.mount('https://', adapter)
    session.mount('http://', adapter)
    return session


def normalize(vec: np.ndarray) -> Optional[np.ndarray]:
    norm = float(np.linalg.norm(vec))
    if norm <= 0:
        return None
    return vec / norm


def cosine_to_percent(cosine: float) -> float:
    score = ((float(cosine) - COSINE_MAP_FLOOR) / COSINE_MAP_SPAN) * 100.0
    return max(0.0, min(100.0, score))


def percent_to_cosine_threshold(percent: float) -> float:
    clamped = max(1.0, min(100.0, float(percent)))
    return COSINE_MAP_FLOOR + (clamped / 100.0) * COSINE_MAP_SPAN


def model_min_bytes(file_name: str) -> int:
    if 'recognition' in file_name:
        return 5_000_000
    return 100_000


def download_if_missing(session: requests.Session, model_path: Path, model_url: str) -> None:
    if model_path.exists() and model_path.stat().st_size >= model_min_bytes(model_path.name):
        return

    model_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = model_path.with_suffix(model_path.suffix + '.tmp')

    response = session.get(model_url, timeout=180, stream=True)
    if response.status_code != 200:
        raise RuntimeError(f'Model download failed ({response.status_code}) for {model_path.name}')

    with tmp_path.open('wb') as f:
        for chunk in response.iter_content(chunk_size=1024 * 512):
            if chunk:
                f.write(chunk)

    if tmp_path.stat().st_size < model_min_bytes(model_path.name):
        tmp_path.unlink(missing_ok=True)
        raise RuntimeError(f'Downloaded model file is incomplete for {model_path.name}')

    tmp_path.replace(model_path)


def ensure_models(session: requests.Session) -> Tuple[str, str]:
    yunet_path = MODEL_CACHE_DIR / YUNET_MODEL_FILE
    sface_path = MODEL_CACHE_DIR / SFACE_MODEL_FILE

    download_if_missing(session, yunet_path, YUNET_MODEL_URL)
    download_if_missing(session, sface_path, SFACE_MODEL_URL)

    return str(yunet_path), str(sface_path)


def read_cv_image_from_bytes(image_bytes: bytes) -> Optional[np.ndarray]:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    if arr.size == 0:
        return None
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def resize_for_inference(image: np.ndarray, max_side: int) -> np.ndarray:
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


def create_detector(
    yunet_model_path: str,
    det_size: int,
    det_score_threshold: float,
) -> cv2.FaceDetectorYN:
    detector = cv2.FaceDetectorYN.create(
        yunet_model_path,
        '',
        (det_size, det_size),
        float(det_score_threshold),
        0.3,
        5000,
    )
    if detector is None:
        raise RuntimeError('Failed to initialize YuNet face detector')
    return detector


def create_detector_and_recognizer(
    yunet_model_path: str,
    sface_model_path: str,
    det_size: int,
    det_score_threshold: float,
) -> Tuple[cv2.FaceDetectorYN, cv2.FaceRecognizerSF]:
    detector = create_detector(yunet_model_path=yunet_model_path, det_size=det_size, det_score_threshold=det_score_threshold)

    recognizer = cv2.FaceRecognizerSF.create(sface_model_path, '')
    if recognizer is None:
        raise RuntimeError('Failed to initialize SFace recognizer')

    return detector, recognizer


def detect_faces(
    image: np.ndarray,
    detector: cv2.FaceDetectorYN,
    min_face_ratio: float,
    max_faces_per_image: int,
) -> List[Tuple[np.ndarray, float, float]]:
    image_h, image_w = image.shape[:2]
    if image_h < 2 or image_w < 2:
        return []

    detector.setInputSize((image_w, image_h))
    _ok, faces = detector.detect(image)
    if faces is None or len(faces) == 0:
        return []

    image_area = float(image_h * image_w)
    candidates: List[Tuple[np.ndarray, float, float]] = []
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
    return candidates[: max(1, max_faces_per_image)]


def face_sharpness(image: np.ndarray, face: np.ndarray) -> float:
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


def face_feature(
    image: np.ndarray,
    face: np.ndarray,
    recognizer: cv2.FaceRecognizerSF,
) -> Optional[np.ndarray]:
    aligned = recognizer.alignCrop(image, face)
    if aligned is None or aligned.size == 0:
        return None

    feature = recognizer.feature(aligned)
    if feature is None:
        return None

    vec = np.asarray(feature, dtype=np.float32).reshape(-1)
    return normalize(vec)


def pick_reference_face(candidates: List[Tuple[np.ndarray, float, float]], image: np.ndarray) -> Optional[np.ndarray]:
    if not candidates:
        return None

    image_h, image_w = image.shape[:2]
    best_face: Optional[np.ndarray] = None
    best_rank = -1e9

    for face, conf, area_ratio in candidates:
        x, y, w, h = [float(v) for v in face[:4]]
        cx = (x + (w / 2.0)) / max(1.0, float(image_w))
        cy = (y + (h / 2.0)) / max(1.0, float(image_h))
        center_offset = abs(cx - 0.5) + abs(cy - 0.5)
        rank = (area_ratio * 6.0) + (conf * 1.8) - (center_offset * 0.8)
        if rank > best_rank:
            best_rank = rank
            best_face = face

    return best_face


def get_reference_feature(
    reference_detector: cv2.FaceDetectorYN,
    recognizer: cv2.FaceRecognizerSF,
    reference_image_path: str,
    min_face_ratio: float,
    max_faces_per_image: int,
    resize_max_side: int,
    min_sharpness: float,
) -> np.ndarray:
    with open(reference_image_path, 'rb') as f:
        image_bytes = f.read()

    image = read_cv_image_from_bytes(image_bytes)
    if image is None:
        raise RuntimeError('Unable to decode reference image')

    image = resize_for_inference(image, resize_max_side)
    candidates = detect_faces(image, reference_detector, min_face_ratio, max_faces_per_image)
    if not candidates:
        relaxed_ratio = max(0.0015, min_face_ratio * 0.55)
        candidates = detect_faces(image, reference_detector, relaxed_ratio, max_faces_per_image)
    if not candidates:
        raise RuntimeError('No clear face found in reference image')

    ref_face = pick_reference_face(candidates, image)
    if ref_face is None:
        raise RuntimeError('Unable to choose reference face from image')

    sharpness = face_sharpness(image, ref_face)
    if sharpness < min_sharpness:
        raise RuntimeError(
            f'Reference face is too blurry (sharpness={sharpness:.1f}, minimum={min_sharpness:.1f}).'
            ' Upload a clearer front-facing selfie.'
        )

    feature = face_feature(image, ref_face, recognizer)
    if feature is None:
        raise RuntimeError('Unable to build reference face feature')

    return feature


def utc_now_iso() -> str:
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def cache_path_for_folder(cache_dir: Path, folder_id: str) -> Path:
    safe_folder = ''.join(ch for ch in str(folder_id) if ch.isalnum() or ch in ('-', '_')) or 'folder'
    return cache_dir / f'{safe_folder}.json'


def file_content_stamp(file: Dict[str, Any]) -> str:
    modified_time = str(file.get('modifiedTime') or '')
    size = str(file.get('size') or '')
    name = str(file.get('name') or '')
    return f'{modified_time}|{size}|{name}'


def load_folder_cache(cache_dir: Path, folder_id: str) -> Dict[str, Any]:
    cache_file = cache_path_for_folder(cache_dir, folder_id)
    if not cache_file.exists():
        return {'folderId': folder_id, 'items': {}}

    try:
        payload = json.loads(cache_file.read_text(encoding='utf-8'))
    except Exception:
        return {'folderId': folder_id, 'items': {}}

    if not isinstance(payload, dict):
        return {'folderId': folder_id, 'items': {}}
    items = payload.get('items')
    if not isinstance(items, dict):
        payload['items'] = {}
    payload['folderId'] = folder_id
    return payload


def save_folder_cache(cache_dir: Path, folder_id: str, payload: Dict[str, Any]) -> None:
    cache_file = cache_path_for_folder(cache_dir, folder_id)
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    tmp_file = cache_file.with_suffix('.tmp')
    tmp_file.write_text(json.dumps(payload, separators=(',', ':')), encoding='utf-8')
    tmp_file.replace(cache_file)


def build_face_embeddings_for_image(
    original_image: np.ndarray,
    detector: cv2.FaceDetectorYN,
    recognizer: cv2.FaceRecognizerSF,
    min_face_ratio: float,
    max_faces_per_image: int,
    resize_max_side: int,
    min_sharpness: float,
) -> List[Dict[str, Any]]:
    image = resize_for_inference(original_image, resize_max_side)
    candidates = detect_faces(image, detector, min_face_ratio, max_faces_per_image)
    if (
        not candidates
        and image.shape[:2] != original_image.shape[:2]
        and max(original_image.shape[:2]) > max(1800, resize_max_side + 200)
    ):
        candidates = detect_faces(
            original_image,
            detector,
            max(0.0008, min_face_ratio * 0.75),
            max_faces_per_image * 2,
        )
        if candidates:
            image = original_image

    embeddings: List[Dict[str, Any]] = []
    for face, det_conf, area_ratio in candidates:
        sharpness = face_sharpness(image, face)
        if sharpness < min_sharpness:
            continue
        feature = face_feature(image, face, recognizer)
        if feature is None:
            continue
        embeddings.append(
            {
                'embedding': [round(float(v), 7) for v in feature.tolist()],
                'areaRatio': round(float(area_ratio), 6),
                'detConfidence': round(float(det_conf), 6),
                'sharpness': round(float(sharpness), 2),
            }
        )
    return embeddings


def best_similarity_from_cached_embeddings(
    reference_feature: np.ndarray,
    cached_embeddings: Any,
) -> Tuple[float, float]:
    if not isinstance(cached_embeddings, list) or not cached_embeddings:
        return -1.0, 0.0

    best_cosine = -1.0
    best_area_ratio = 0.0
    for item in cached_embeddings:
        if not isinstance(item, dict):
            continue
        values = item.get('embedding')
        if not isinstance(values, list) or not values:
            continue
        vec = np.asarray(values, dtype=np.float32).reshape(-1)
        norm_vec = normalize(vec)
        if norm_vec is None:
            continue
        cosine = float(np.dot(reference_feature, norm_vec))
        if cosine > best_cosine:
            best_cosine = cosine
            try:
                best_area_ratio = float(item.get('areaRatio') or 0.0)
            except Exception:
                best_area_ratio = 0.0
    return best_cosine, best_area_ratio


def sql_ident(value: str) -> str:
    if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', value or ''):
        raise RuntimeError(f'Invalid SQL identifier: {value!r}')
    return f'"{value}"'


def sql_qual_name(schema: str, table: str) -> str:
    return f'{sql_ident(schema)}.{sql_ident(table)}'


def vector_literal(values: List[float]) -> str:
    return '[' + ','.join(f'{float(v):.8f}' for v in values) + ']'


def parse_vector_text(value: Any) -> Optional[List[float]]:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    if raw.startswith('[') and raw.endswith(']'):
        raw = raw[1:-1]
    if not raw:
        return []
    try:
        return [float(part.strip()) for part in raw.split(',') if part.strip()]
    except Exception:
        return None


def init_pgvector_store(conn: Any, schema: str, table_prefix: str, vector_dim: int) -> Dict[str, str]:
    if vector_dim <= 0:
        raise RuntimeError('Invalid embedding dimension for pgvector store')

    files_table = f'{table_prefix}_files'
    embeddings_table = f'{table_prefix}_embeddings'
    files_q = sql_qual_name(schema, files_table)
    embeddings_q = sql_qual_name(schema, embeddings_table)
    idx_folder = sql_ident(f'{table_prefix}_embeddings_folder_idx')
    idx_vector = sql_ident(f'{table_prefix}_embeddings_vector_idx')

    with conn.cursor() as cur:
        cur.execute('CREATE EXTENSION IF NOT EXISTS vector')
        cur.execute(f'CREATE SCHEMA IF NOT EXISTS {sql_ident(schema)}')
        cur.execute(
            f'''
            CREATE TABLE IF NOT EXISTS {files_q} (
                folder_id TEXT NOT NULL,
                file_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                web_view_link TEXT NOT NULL,
                preview_url TEXT NOT NULL,
                download_url TEXT NOT NULL,
                stamp TEXT NOT NULL,
                status TEXT NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (folder_id, file_id)
            )
            '''
        )
        cur.execute(
            f'''
            CREATE TABLE IF NOT EXISTS {embeddings_q} (
                folder_id TEXT NOT NULL,
                file_id TEXT NOT NULL,
                face_idx INTEGER NOT NULL,
                embedding VECTOR({int(vector_dim)}) NOT NULL,
                area_ratio REAL NOT NULL DEFAULT 0,
                det_confidence REAL NOT NULL DEFAULT 0,
                sharpness REAL NOT NULL DEFAULT 0,
                stamp TEXT NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (folder_id, file_id, face_idx),
                FOREIGN KEY (folder_id, file_id) REFERENCES {files_q}(folder_id, file_id) ON DELETE CASCADE
            )
            '''
        )
        cur.execute(f'CREATE INDEX IF NOT EXISTS {idx_folder} ON {embeddings_q}(folder_id, file_id)')
        cur.execute(
            f'''
            CREATE INDEX IF NOT EXISTS {idx_vector}
            ON {embeddings_q} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
            '''
        )

    return {'files': files_q, 'embeddings': embeddings_q}


def pg_load_cached_embeddings(
    conn: Any,
    tables: Dict[str, str],
    folder_id: str,
    file_id: str,
    stamp: str,
) -> Optional[List[Dict[str, Any]]]:
    with conn.cursor() as cur:
        cur.execute(
            f'''
            SELECT status
            FROM {tables["files"]}
            WHERE folder_id = %s AND file_id = %s AND stamp = %s
            LIMIT 1
            ''',
            (folder_id, file_id, stamp),
        )
        file_row = cur.fetchone()
        if not file_row:
            return None

        status = str(file_row[0] or '')
        if status != 'ok':
            return []

        cur.execute(
            f'''
            SELECT embedding::text, area_ratio, det_confidence, sharpness
            FROM {tables["embeddings"]}
            WHERE folder_id = %s AND file_id = %s AND stamp = %s
            ORDER BY face_idx ASC
            ''',
            (folder_id, file_id, stamp),
        )
        rows = cur.fetchall()
        out: List[Dict[str, Any]] = []
        for emb_text, area_ratio, det_confidence, sharpness in rows:
            emb = parse_vector_text(emb_text)
            if emb is None:
                continue
            out.append(
                {
                    'embedding': emb,
                    'areaRatio': float(area_ratio or 0.0),
                    'detConfidence': float(det_confidence or 0.0),
                    'sharpness': float(sharpness or 0.0),
                }
            )
        return out


def pg_load_latest_embeddings(
    conn: Any,
    tables: Dict[str, str],
    folder_id: str,
    file_id: str,
) -> List[Dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            f'''
            SELECT stamp
            FROM {tables["files"]}
            WHERE folder_id = %s AND file_id = %s AND status = 'ok'
            ORDER BY updated_at DESC
            LIMIT 1
            ''',
            (folder_id, file_id),
        )
        row = cur.fetchone()
        if not row:
            return []
        stamp = str(row[0] or '')
    return pg_load_cached_embeddings(conn, tables, folder_id, file_id, stamp) or []


def pg_upsert_file_embeddings(
    conn: Any,
    tables: Dict[str, str],
    folder_id: str,
    file_id: str,
    file_name: str,
    mime_type: str,
    web_view_link: str,
    preview_url: str,
    download_url: str,
    stamp: str,
    embeddings: List[Dict[str, Any]],
) -> None:
    status = 'ok' if embeddings else 'no_face'
    with conn.cursor() as cur:
        cur.execute(
            f'''
            INSERT INTO {tables["files"]} (
                folder_id, file_id, file_name, mime_type, web_view_link, preview_url, download_url, stamp, status, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (folder_id, file_id) DO UPDATE SET
                file_name = EXCLUDED.file_name,
                mime_type = EXCLUDED.mime_type,
                web_view_link = EXCLUDED.web_view_link,
                preview_url = EXCLUDED.preview_url,
                download_url = EXCLUDED.download_url,
                stamp = EXCLUDED.stamp,
                status = EXCLUDED.status,
                updated_at = NOW()
            ''',
            (folder_id, file_id, file_name, mime_type, web_view_link, preview_url, download_url, stamp, status),
        )
        cur.execute(
            f'''
            DELETE FROM {tables["embeddings"]}
            WHERE folder_id = %s AND file_id = %s
            ''',
            (folder_id, file_id),
        )

        if not embeddings:
            return

        rows: List[Tuple[Any, ...]] = []
        for idx, emb in enumerate(embeddings):
            values = emb.get('embedding')
            if not isinstance(values, list) or not values:
                continue
            rows.append(
                (
                    folder_id,
                    file_id,
                    idx,
                    vector_literal([float(v) for v in values]),
                    float(emb.get('areaRatio') or 0.0),
                    float(emb.get('detConfidence') or 0.0),
                    float(emb.get('sharpness') or 0.0),
                    stamp,
                )
            )

        if not rows:
            return

        if execute_values is None:
            for row in rows:
                cur.execute(
                    f'''
                    INSERT INTO {tables["embeddings"]} (
                        folder_id, file_id, face_idx, embedding, area_ratio, det_confidence, sharpness, stamp, updated_at
                    ) VALUES (%s, %s, %s, %s::vector, %s, %s, %s, %s, NOW())
                    ''',
                    row,
                )
            return

        execute_values(
            cur,
            f'''
            INSERT INTO {tables["embeddings"]} (
                folder_id, file_id, face_idx, embedding, area_ratio, det_confidence, sharpness, stamp, updated_at
            ) VALUES %s
            ''',
            rows,
            template='(%s, %s, %s, %s::vector, %s, %s, %s, %s, NOW())',
        )


def pg_prune_stale_files(
    conn: Any,
    tables: Dict[str, str],
    folder_id: str,
    keep_file_ids: List[str],
) -> int:
    with conn.cursor() as cur:
        if keep_file_ids:
            placeholders = ','.join(['%s'] * len(keep_file_ids))
            cur.execute(
                f'''
                DELETE FROM {tables["files"]}
                WHERE folder_id = %s
                  AND file_id NOT IN ({placeholders})
                ''',
                [folder_id] + keep_file_ids,
            )
        else:
            cur.execute(
                f'''
                DELETE FROM {tables["files"]}
                WHERE folder_id = %s
                ''',
                (folder_id,),
            )
        return int(cur.rowcount or 0)


def list_folder_images(session: requests.Session, folder_id: str, api_key: str, max_images: int) -> List[Dict[str, Any]]:
    unlimited = max_images <= 0

    files: List[Dict[str, Any]] = []
    visited_folders = set()
    pending_folders = deque([str(folder_id)])

    while pending_folders and (unlimited or len(files) < max_images):
        current_folder_id = pending_folders.popleft()
        if not current_folder_id or current_folder_id in visited_folders:
            continue
        visited_folders.add(current_folder_id)

        page_token: Optional[str] = None
        while unlimited or len(files) < max_images:
            page_size = 200 if unlimited else min(200, max(20, max_images - len(files)))
            params = {
                'q': (
                    f"'{current_folder_id}' in parents and trashed = false and "
                    f"(mimeType contains 'image/' or mimeType = '{DRIVE_FOLDER_MIME}')"
                ),
                'pageSize': page_size,
                'fields': 'nextPageToken, files(id,name,mimeType,webViewLink,modifiedTime,size)',
                'supportsAllDrives': 'true',
                'includeItemsFromAllDrives': 'true',
                'key': api_key,
            }
            if page_token:
                params['pageToken'] = page_token

            response = session.get(DRIVE_LIST_URL, params=params, timeout=40)
            if response.status_code != 200:
                raise RuntimeError(f'Drive list API failed ({response.status_code}): {response.text[:220]}')

            payload = response.json()
            for item in payload.get('files', []):
                file_id = str(item.get('id') or '')
                mime_type = str(item.get('mimeType') or '')
                if not file_id:
                    continue

                if mime_type == DRIVE_FOLDER_MIME:
                    if file_id not in visited_folders:
                        pending_folders.append(file_id)
                    continue

                if mime_type.startswith('image/'):
                    files.append(item)
                    if not unlimited and len(files) >= max_images:
                        break

            page_token = payload.get('nextPageToken')
            if not page_token:
                break

    return files if unlimited else files[:max_images]


def parse_non_200_body(response: requests.Response) -> str:
    try:
        return (response.text or '')[:260]
    except Exception:
        return ''


def is_anti_bot_response(status_code: int, body_text: str) -> bool:
    if status_code not in (403, 429):
        return False
    lower = (body_text or '').lower()
    return (
        'automated queries' in lower
        or "we're sorry" in lower
        or 'sorry...' in lower
        or 'unusual traffic' in lower
    )


def looks_like_html(content: bytes, content_type: str) -> bool:
    ct = (content_type or '').lower()
    if 'text/html' in ct:
        return True
    prefix = (content or b'')[:300].lower()
    return b'<html' in prefix or b'<!doctype html' in prefix or b'<head' in prefix


def looks_like_image_bytes(content: bytes, content_type: str) -> bool:
    if not content or len(content) < 64:
        return False
    ct = (content_type or '').lower().strip()
    if ct.startswith('image/'):
        return True
    return (
        content.startswith(b'\xff\xd8\xff')
        or content.startswith(b'\x89PNG\r\n\x1a\n')
        or content.startswith(b'RIFF')
        or content.startswith(b'GIF87a')
        or content.startswith(b'GIF89a')
        or content.startswith(b'BM')
    )


def download_drive_image_public_fallback(session: requests.Session, file_id: str) -> Optional[bytes]:
    options = [
        (
            'https://drive.usercontent.google.com/download',
            {'id': file_id, 'export': 'download', 'confirm': 't'},
        ),
        (
            'https://drive.google.com/uc',
            {'export': 'download', 'id': file_id},
        ),
        (
            'https://drive.google.com/uc',
            {'export': 'view', 'id': file_id},
        ),
        (
            'https://drive.google.com/thumbnail',
            {'id': file_id, 'sz': 'w2200'},
        ),
        (
            f'https://lh3.googleusercontent.com/d/{file_id}=w2200',
            None,
        ),
    ]

    headers = {'User-Agent': 'DriveFaceDashboard/1.0'}
    for url, params in options:
        try:
            response = session.get(url, params=params, timeout=80, headers=headers)
            if response.status_code != 200:
                continue
            body = response.content
            content_type = response.headers.get('content-type', '')
            if looks_like_html(body, content_type):
                continue
            if looks_like_image_bytes(body, content_type):
                return body
        except Exception:
            continue

    return None


def download_drive_image(
    session: requests.Session,
    file_id: str,
    api_key: str,
    prefer_public_download: bool,
) -> Tuple[bytes, bool]:
    if prefer_public_download:
        fallback_bytes = download_drive_image_public_fallback(session, file_id)
        if fallback_bytes is not None:
            return fallback_bytes, False

    last_error = ''
    anti_bot_seen = False
    for attempt in range(2):
        response = session.get(
            DRIVE_MEDIA_URL.format(file_id=file_id),
            params={'alt': 'media', 'key': api_key},
            timeout=80,
            headers={'User-Agent': 'DriveFaceDashboard/1.0'},
        )
        if response.status_code == 200:
            body = response.content
            content_type = response.headers.get('content-type', '')
            if looks_like_html(body, content_type):
                anti_bot_seen = True
                last_error = 'Drive media blocked by Google anti-bot (200 html challenge)'
                break
            if looks_like_image_bytes(body, content_type):
                return body, anti_bot_seen

        body = parse_non_200_body(response)
        if is_anti_bot_response(response.status_code, body):
            anti_bot_seen = True
            last_error = f'Drive media blocked by Google anti-bot ({response.status_code})'
            break

        if response.status_code in (500, 502, 503, 504):
            sleep_s = min(6.0, (0.6 * (2 ** attempt)) + random.uniform(0.0, 0.3))
            time.sleep(sleep_s)
            last_error = f'Drive media temporary failure ({response.status_code})'
            continue

        last_error = f'Drive media fetch failed ({response.status_code}): {body}'
        break

    fallback_bytes = download_drive_image_public_fallback(session, file_id)
    if fallback_bytes is not None:
        return fallback_bytes, False

    raise RuntimeError(last_error or 'Drive media fetch failed after retries')


def filter_by_top_margin(matches: List[Dict[str, Any]], threshold: float, top_margin: float) -> List[Dict[str, Any]]:
    if not matches:
        return matches
    if top_margin <= 0:
        return matches

    best_score = float(matches[0]['similarity'])
    floor = max(float(threshold), best_score - float(top_margin))
    return [item for item in matches if float(item['similarity']) >= floor]


def effective_threshold_for_face_size(
    base_threshold: float,
    area_ratio: float,
    small_face_ref_ratio: float,
    small_face_min_ratio: float,
    small_face_threshold_drop: float,
) -> float:
    if area_ratio >= small_face_ref_ratio:
        return base_threshold
    if area_ratio <= small_face_min_ratio:
        return max(1.0, base_threshold - small_face_threshold_drop)

    span = max(1e-9, small_face_ref_ratio - small_face_min_ratio)
    progress = (small_face_ref_ratio - area_ratio) / span
    progress = max(0.0, min(1.0, progress))
    return max(1.0, base_threshold - (progress * small_face_threshold_drop))


def pick_matches_with_adaptive_fallback(
    candidates: List[Dict[str, Any]],
    strict_threshold: float,
    top_margin: float,
    relax_drop: float,
    relax_min_threshold: float,
) -> Tuple[List[Dict[str, Any]], float, bool]:
    strict_matches = [c for c in candidates if float(c.get('similarity', 0.0)) >= strict_threshold]
    strict_matches.sort(key=lambda x: x['similarity'], reverse=True)
    strict_matches = filter_by_top_margin(strict_matches, threshold=strict_threshold, top_margin=top_margin)
    if strict_matches:
        return strict_matches, strict_threshold, False

    if not candidates:
        return [], strict_threshold, False

    relaxed_threshold = max(float(relax_min_threshold), float(strict_threshold) - max(0.0, float(relax_drop)))
    relaxed_matches = [c for c in candidates if float(c.get('similarity', 0.0)) >= relaxed_threshold]
    relaxed_matches.sort(key=lambda x: x['similarity'], reverse=True)
    relaxed_matches = filter_by_top_margin(
        relaxed_matches,
        threshold=relaxed_threshold,
        top_margin=max(float(top_margin), 10.0),
    )
    if relaxed_matches:
        return relaxed_matches, relaxed_threshold, True

    return [], strict_threshold, False


def pick_low_confidence_best_effort(
    candidates: List[Dict[str, Any]],
    min_similarity: float,
    min_gap: float,
    max_results: int,
) -> List[Dict[str, Any]]:
    if not candidates:
        return []

    ordered = sorted(candidates, key=lambda x: float(x.get('similarity', 0.0)), reverse=True)
    top = float(ordered[0].get('similarity', 0.0))
    if top < min_similarity:
        return []

    second = float(ordered[1].get('similarity', 0.0)) if len(ordered) > 1 else -999.0
    gap = top - second
    if len(ordered) > 1 and gap < min_gap:
        return []

    floor = max(min_similarity, top - 5.0)
    kept = [item for item in ordered if float(item.get('similarity', 0.0)) >= floor]
    return kept[: max(1, max_results)]


def emit_progress(payload: Dict[str, Any]) -> None:
    try:
        print('PROGRESS ' + json.dumps(payload, separators=(',', ':')), file=sys.stderr, flush=True)
    except Exception:
        pass


def main() -> int:
    args = parse_args()
    raw_max_images = int(args.max_images)
    max_images = raw_max_images if raw_max_images > 0 else 0
    threshold = max(1.0, min(100.0, float(args.threshold)))
    min_face_ratio = max(0.001, min(0.5, float(args.min_face_ratio)))
    min_sharpness = max(0.0, float(args.min_sharpness))
    ref_det_size = max(160, int(args.ref_det_size))
    ref_det_score_threshold = max(0.25, min(0.95, float(args.ref_det_score_threshold)))
    ref_min_face_ratio = max(0.001, min(0.5, float(args.ref_min_face_ratio)))
    ref_min_sharpness = max(0.0, float(args.ref_min_sharpness))
    max_faces_per_image = max(1, int(args.max_faces_per_image))
    resize_max_side = max(320, int(args.resize_max_side))
    auto_relax_drop = max(0.0, float(args.auto_relax_drop))
    auto_relax_min_threshold = max(1.0, min(100.0, float(args.auto_relax_min_threshold)))
    download_delay_ms = max(0, int(args.download_delay_ms))
    max_consecutive_download_errors = max(3, int(args.max_consecutive_download_errors))
    raw_scan_limit = int(args.scan_time_limit_sec)
    scan_time_limit_sec = max(45, raw_scan_limit) if raw_scan_limit > 0 else 0
    prefer_public_download = DEFAULT_PREFER_PUBLIC_DOWNLOAD
    small_face_ref_ratio = max(0.0008, float(args.small_face_ref_ratio))
    small_face_min_ratio = max(0.0002, min(float(args.small_face_min_ratio), small_face_ref_ratio - 0.0001))
    small_face_threshold_drop = max(0.0, min(30.0, float(args.small_face_threshold_drop)))
    best_effort_min_similarity = max(1.0, min(100.0, float(args.best_effort_min_similarity)))
    best_effort_min_gap = max(0.0, float(args.best_effort_min_gap))
    best_effort_max_results = max(1, int(args.best_effort_max_results))

    session = build_http_session()
    pg_conn: Any = None

    try:
        yunet_model_path, sface_model_path = ensure_models(session)
        strict_det_size = max(160, int(args.det_size))
        strict_det_score_threshold = max(0.3, min(0.98, float(args.det_score_threshold)))
        detector, recognizer = create_detector_and_recognizer(
            yunet_model_path=yunet_model_path,
            sface_model_path=sface_model_path,
            det_size=strict_det_size,
            det_score_threshold=strict_det_score_threshold,
        )
        reference_detector = detector
        if ref_det_size != strict_det_size or abs(ref_det_score_threshold - strict_det_score_threshold) > 1e-6:
            reference_detector = create_detector(
                yunet_model_path=yunet_model_path,
                det_size=ref_det_size,
                det_score_threshold=ref_det_score_threshold,
            )

        reference_feature = get_reference_feature(
            reference_detector=reference_detector,
            recognizer=recognizer,
            reference_image_path=args.reference_image,
            min_face_ratio=ref_min_face_ratio,
            max_faces_per_image=max_faces_per_image,
            resize_max_side=resize_max_side,
            min_sharpness=ref_min_sharpness,
        )
        files = list_folder_images(session, args.folder_id, args.google_api_key, max_images)

        vector_backend = str(args.vector_backend or DEFAULT_VECTOR_BACKEND).strip().lower()
        use_pgvector = vector_backend == 'pgvector'
        pgvector_tables: Dict[str, str] = {}
        metadata_cache_dir = Path(args.metadata_cache_dir).expanduser()
        cache_payload: Dict[str, Any] = {}
        cache_items: Dict[str, Any] = {}
        cache_changed = False
        refreshed_files = 0
        reused_cached_files = 0
        removed_cache_files = 0
        cache_save_warning = ''

        if use_pgvector:
            if psycopg2 is None:
                raise RuntimeError('pgvector backend requires psycopg2-binary in Python environment')
            pg_dsn = str(args.pgvector_dsn or '').strip()
            if not pg_dsn:
                raise RuntimeError('Missing --pgvector-dsn (or FACE_PGVECTOR_DSN) for pgvector backend')
            pg_conn = psycopg2.connect(pg_dsn)
            pg_conn.autocommit = True
            pgvector_tables = init_pgvector_store(
                pg_conn,
                schema=str(args.pgvector_schema or DEFAULT_PGVECTOR_SCHEMA).strip() or 'public',
                table_prefix=str(args.pgvector_table_prefix or DEFAULT_PGVECTOR_TABLE_PREFIX).strip() or 'drive_face',
                vector_dim=int(reference_feature.shape[0]),
            )
        else:
            cache_payload = load_folder_cache(metadata_cache_dir, args.folder_id)
            cache_items_any = cache_payload.get('items')
            cache_items = cache_items_any if isinstance(cache_items_any, dict) else {}

        candidate_matches: List[Dict[str, Any]] = []
        listed_count = len(files)
        completed_count = 0
        processed_count = 0
        download_error_count = 0
        consecutive_download_errors = 0
        timed_out = False
        started_at = time.monotonic()
        seen_file_ids = set()
        emit_progress(
            {
                'phase': 'listed',
                'listed': listed_count,
                'completed': completed_count,
                'processed': processed_count,
                'percent': 0.0,
            }
        )

        for file in files:
            if scan_time_limit_sec > 0 and (time.monotonic() - started_at) >= scan_time_limit_sec:
                timed_out = True
                break
            file_id = file.get('id')
            if not file_id:
                continue
            file_id = str(file_id)
            seen_file_ids.add(file_id)

            file_name = file.get('name') or file_id
            mime_type = file.get('mimeType') or 'image/jpeg'
            web_view_link = file.get('webViewLink') or f'https://drive.google.com/file/d/{file_id}/view'
            preview_url = f'https://drive.google.com/thumbnail?id={file_id}&sz=w1200'
            download_url = f'https://drive.google.com/uc?export=download&id={file_id}'
            stamp = file_content_stamp(file)
            cache_entry = cache_items.get(file_id) if not use_pgvector else None
            cached_embeddings: Optional[List[Dict[str, Any]]] = None

            if use_pgvector:
                cached_embeddings = pg_load_cached_embeddings(
                    pg_conn,
                    pgvector_tables,
                    folder_id=str(args.folder_id),
                    file_id=file_id,
                    stamp=stamp,
                )
                if cached_embeddings is not None:
                    reused_cached_files += 1
            elif isinstance(cache_entry, dict):
                entry_stamp = str(cache_entry.get('stamp') or '')
                entry_embeddings = cache_entry.get('embeddings')
                if entry_stamp == stamp and isinstance(entry_embeddings, list):
                    cached_embeddings = entry_embeddings
                    reused_cached_files += 1

            try:
                if cached_embeddings is None:
                    if download_delay_ms > 0:
                        time.sleep((download_delay_ms + random.uniform(0.0, 90.0)) / 1000.0)

                    image_bytes, _anti_bot_seen = download_drive_image(
                        session,
                        file_id,
                        args.google_api_key,
                        prefer_public_download=prefer_public_download,
                    )
                    consecutive_download_errors = 0
                    original_image = read_cv_image_from_bytes(image_bytes)
                    if original_image is None:
                        if use_pgvector:
                            pg_upsert_file_embeddings(
                                pg_conn,
                                pgvector_tables,
                                folder_id=str(args.folder_id),
                                file_id=file_id,
                                file_name=file_name,
                                mime_type=mime_type,
                                web_view_link=web_view_link,
                                preview_url=preview_url,
                                download_url=download_url,
                                stamp=stamp,
                                embeddings=[],
                            )
                        else:
                            cache_items[file_id] = {
                                'fileId': file_id,
                                'fileName': file_name,
                                'mimeType': mime_type,
                                'webViewLink': web_view_link,
                                'previewUrl': preview_url,
                                'downloadUrl': download_url,
                                'stamp': stamp,
                                'status': 'decode_error',
                                'embeddings': [],
                                'updatedAt': utc_now_iso(),
                            }
                            cache_changed = True
                        processed_count += 1
                        continue

                    cached_embeddings = build_face_embeddings_for_image(
                        original_image=original_image,
                        detector=detector,
                        recognizer=recognizer,
                        min_face_ratio=min_face_ratio,
                        max_faces_per_image=max_faces_per_image,
                        resize_max_side=resize_max_side,
                        min_sharpness=min_sharpness,
                    )
                    if use_pgvector:
                        pg_upsert_file_embeddings(
                            pg_conn,
                            pgvector_tables,
                            folder_id=str(args.folder_id),
                            file_id=file_id,
                            file_name=file_name,
                            mime_type=mime_type,
                            web_view_link=web_view_link,
                            preview_url=preview_url,
                            download_url=download_url,
                            stamp=stamp,
                            embeddings=cached_embeddings,
                        )
                    else:
                        cache_items[file_id] = {
                            'fileId': file_id,
                            'fileName': file_name,
                            'mimeType': mime_type,
                            'webViewLink': web_view_link,
                            'previewUrl': preview_url,
                            'downloadUrl': download_url,
                            'stamp': stamp,
                            'status': 'ok' if cached_embeddings else 'no_face',
                            'embeddings': cached_embeddings,
                            'updatedAt': utc_now_iso(),
                        }
                        cache_changed = True
                    refreshed_files += 1
                elif not use_pgvector and isinstance(cache_entry, dict):
                    cache_entry['fileName'] = file_name
                    cache_entry['mimeType'] = mime_type
                    cache_entry['webViewLink'] = web_view_link
                    cache_entry['previewUrl'] = preview_url
                    cache_entry['downloadUrl'] = download_url
                    cache_entry['stamp'] = stamp
                    cache_items[file_id] = cache_entry

                processed_count += 1
                best_cosine, best_area_ratio = best_similarity_from_cached_embeddings(reference_feature, cached_embeddings)
                if best_cosine < -0.2:
                    continue

                similarity = cosine_to_percent(best_cosine)
                image_threshold = effective_threshold_for_face_size(
                    base_threshold=threshold,
                    area_ratio=best_area_ratio,
                    small_face_ref_ratio=small_face_ref_ratio,
                    small_face_min_ratio=small_face_min_ratio,
                    small_face_threshold_drop=small_face_threshold_drop,
                )

                candidate_matches.append(
                    {
                        'fileId': file_id,
                        'fileName': file_name,
                        'mimeType': mime_type,
                        'webViewLink': web_view_link,
                        'previewUrl': preview_url,
                        'downloadUrl': download_url,
                        'similarity': round(float(similarity), 2),
                        'appliedThreshold': round(float(image_threshold), 2),
                    }
                )
            except Exception as item_error:
                download_error_count += 1
                consecutive_download_errors += 1
                print(f'Skipping {file_id}: {item_error}', file=sys.stderr)

                if use_pgvector:
                    entry_embeddings = pg_load_latest_embeddings(
                        pg_conn,
                        pgvector_tables,
                        folder_id=str(args.folder_id),
                        file_id=file_id,
                    )
                    if entry_embeddings:
                        reused_cached_files += 1
                        processed_count += 1
                        best_cosine, best_area_ratio = best_similarity_from_cached_embeddings(reference_feature, entry_embeddings)
                        if best_cosine >= -0.2:
                            similarity = cosine_to_percent(best_cosine)
                            image_threshold = effective_threshold_for_face_size(
                                base_threshold=threshold,
                                area_ratio=best_area_ratio,
                                small_face_ref_ratio=small_face_ref_ratio,
                                small_face_min_ratio=small_face_min_ratio,
                                small_face_threshold_drop=small_face_threshold_drop,
                            )
                            candidate_matches.append(
                                {
                                    'fileId': file_id,
                                    'fileName': file_name,
                                    'mimeType': mime_type,
                                    'webViewLink': web_view_link,
                                    'previewUrl': preview_url,
                                    'downloadUrl': download_url,
                                    'similarity': round(float(similarity), 2),
                                    'appliedThreshold': round(float(image_threshold), 2),
                                }
                            )
                        consecutive_download_errors = 0
                        continue
                elif isinstance(cache_entry, dict):
                    entry_embeddings = cache_entry.get('embeddings')
                    if isinstance(entry_embeddings, list) and entry_embeddings:
                        reused_cached_files += 1
                        processed_count += 1
                        best_cosine, best_area_ratio = best_similarity_from_cached_embeddings(reference_feature, entry_embeddings)
                        if best_cosine >= -0.2:
                            similarity = cosine_to_percent(best_cosine)
                            image_threshold = effective_threshold_for_face_size(
                                base_threshold=threshold,
                                area_ratio=best_area_ratio,
                                small_face_ref_ratio=small_face_ref_ratio,
                                small_face_min_ratio=small_face_min_ratio,
                                small_face_threshold_drop=small_face_threshold_drop,
                            )
                            candidate_matches.append(
                                {
                                    'fileId': file_id,
                                    'fileName': file_name,
                                    'mimeType': mime_type,
                                    'webViewLink': web_view_link,
                                    'previewUrl': preview_url,
                                    'downloadUrl': download_url,
                                    'similarity': round(float(similarity), 2),
                                    'appliedThreshold': round(float(image_threshold), 2),
                                }
                            )
                        consecutive_download_errors = 0
                        continue

                if consecutive_download_errors >= max_consecutive_download_errors:
                    stop_message = (
                        f'Stopped early after {consecutive_download_errors} consecutive download failures. '
                        'Google may be rate-limiting this server. Retry in 1-2 minutes.'
                    )
                    print(stop_message, file=sys.stderr)
                    break
            finally:
                completed_count += 1
                percent = 100.0 if listed_count <= 0 else min(100.0, (completed_count / listed_count) * 100.0)
                emit_progress(
                    {
                        'phase': 'processing',
                        'listed': listed_count,
                        'completed': completed_count,
                        'processed': processed_count,
                        'percent': round(percent, 2),
                        'fileId': file_id,
                        'fileName': file_name,
                    }
                )

        if use_pgvector:
            try:
                removed_cache_files = pg_prune_stale_files(
                    pg_conn,
                    pgvector_tables,
                    folder_id=str(args.folder_id),
                    keep_file_ids=sorted(list(seen_file_ids)),
                )
            except Exception as cache_err:
                cache_save_warning = f'Could not update pgvector cache ({cache_err})'
                print(cache_save_warning, file=sys.stderr)
        else:
            for cached_file_id in list(cache_items.keys()):
                if cached_file_id not in seen_file_ids:
                    del cache_items[cached_file_id]
                    removed_cache_files += 1
                    cache_changed = True

            cache_payload['folderId'] = args.folder_id
            cache_payload['updatedAt'] = utc_now_iso()
            cache_payload['items'] = cache_items
            try:
                if cache_changed:
                    save_folder_cache(metadata_cache_dir, args.folder_id, cache_payload)
            except Exception as cache_err:
                cache_save_warning = f'Could not update local metadata cache ({cache_err})'
                print(cache_save_warning, file=sys.stderr)

        candidate_matches.sort(key=lambda x: x['similarity'], reverse=True)
        matches, effective_threshold, adaptive_threshold_used = pick_matches_with_adaptive_fallback(
            candidates=candidate_matches,
            strict_threshold=threshold,
            top_margin=float(args.top_margin),
            relax_drop=auto_relax_drop,
            relax_min_threshold=auto_relax_min_threshold,
        )
        best_effort_used = False
        if not matches:
            best_effort = pick_low_confidence_best_effort(
                candidates=candidate_matches,
                min_similarity=best_effort_min_similarity,
                min_gap=best_effort_min_gap,
                max_results=best_effort_max_results,
            )
            if best_effort:
                matches = best_effort
                effective_threshold = min(float(effective_threshold), float(best_effort_min_similarity))
                best_effort_used = True

        warnings: List[str] = []
        if reused_cached_files > 0 or refreshed_files > 0 or removed_cache_files > 0:
            cache_label = 'PGVector cache' if use_pgvector else 'Cache'
            summary = f'{cache_label} reused {reused_cached_files} file(s), refreshed {refreshed_files} file(s)'
            if removed_cache_files > 0:
                summary += f', removed {removed_cache_files} stale file(s)'
            warnings.append(summary + '.')
        if cache_save_warning:
            warnings.append(cache_save_warning)
        if download_error_count > 0:
            warnings.append(f'{download_error_count} file(s) could not be downloaded from Drive.')
        if adaptive_threshold_used:
            warnings.append(f'No strict matches found. Relaxed threshold used: {effective_threshold:.1f}%')
        if best_effort_used:
            warnings.append('Low-confidence fallback was used to include probable matches. Please verify manually.')
        if timed_out:
            warnings.append(
                f'Scan reached time limit ({scan_time_limit_sec}s) and stopped early. '
                'Retry if you want deeper scanning.'
            )

        result = {
            'totalFilesListed': listed_count,
            'totalFilesScanned': processed_count,
            'matchedCount': len(matches),
            'effectiveThreshold': round(float(effective_threshold), 2),
            'adaptiveThresholdUsed': adaptive_threshold_used,
            'downloadErrorCount': download_error_count,
            'vectorBackend': 'pgvector' if use_pgvector else 'file',
            'cacheReusedCount': reused_cached_files,
            'cacheRefreshedCount': refreshed_files,
            'warnings': warnings,
            'matches': matches,
        }
        final_percent = 100.0 if listed_count <= 0 else min(100.0, (completed_count / listed_count) * 100.0)
        emit_progress(
            {
                'phase': 'completed',
                'listed': listed_count,
                'completed': completed_count,
                'processed': processed_count,
                'percent': round(final_percent, 2),
                'matchedCount': len(matches),
            }
        )
        print(json.dumps(result))
        return 0
    except Exception as err:
        print(f'Face matching failed: {err}', file=sys.stderr)
        return 1
    finally:
        try:
            if pg_conn is not None:
                pg_conn.close()
        except Exception:
            pass
        session.close()


if __name__ == '__main__':
    raise SystemExit(main())
