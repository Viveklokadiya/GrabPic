from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

import numpy as np
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Face, FaceCluster, GuestQuery, GuestResult, Photo

COSINE_MAP_FLOOR = 0.15
COSINE_MAP_SPAN = 0.37


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    a = np.asarray(vec_a, dtype=np.float32)
    b = np.asarray(vec_b, dtype=np.float32)
    if a.size == 0 or b.size == 0:
        return 0.0
    a_norm = float(np.linalg.norm(a))
    b_norm = float(np.linalg.norm(b))
    if a_norm <= 0 or b_norm <= 0:
        return 0.0
    return float(np.dot(a / a_norm, b / b_norm))


def batch_cosine_similarities(query: list[float], embeddings: list[list[float]]) -> np.ndarray:
    """Return cosine similarities between *query* and every row in *embeddings*.

    Uses a single vectorised matrix-vector multiply instead of a Python loop,
    which is substantially faster when *embeddings* contains many rows.
    """
    if not embeddings:
        return np.zeros(0, dtype=np.float32)
    q = np.asarray(query, dtype=np.float32)
    q_norm = float(np.linalg.norm(q))
    if q_norm <= 0:
        return np.zeros(len(embeddings), dtype=np.float32)
    q_unit = q / q_norm
    matrix = np.asarray(embeddings, dtype=np.float32)  # shape (N, D)
    norms = np.linalg.norm(matrix, axis=1)  # shape (N,)
    zero_mask = norms <= 0
    safe_norms = np.where(zero_mask, 1.0, norms)
    unit_matrix = matrix / safe_norms[:, np.newaxis]  # shape (N, D)
    result = unit_matrix @ q_unit  # shape (N,)
    result[zero_mask] = 0.0
    return result


def cosine_to_percent(cosine: float) -> float:
    score = ((float(cosine) - COSINE_MAP_FLOOR) / COSINE_MAP_SPAN) * 100.0
    return max(0.0, min(100.0, score))


def percent_to_cosine_threshold(percent: float) -> float:
    clamped = max(1.0, min(100.0, float(percent)))
    return COSINE_MAP_FLOOR + (clamped / 100.0) * COSINE_MAP_SPAN


def choose_best_cluster(
    selfie_embedding: list[float], clusters: list[FaceCluster], min_confidence: float
) -> tuple[FaceCluster | None, float]:
    best_cluster: FaceCluster | None = None
    best_score = -1.0
    for cluster in clusters:
        score = cosine_similarity(selfie_embedding, cluster.centroid)
        if score > best_score:
            best_score = score
            best_cluster = cluster
    if best_cluster is None or best_score < float(min_confidence):
        return None, max(best_score, 0.0)
    return best_cluster, best_score


@dataclass
class RankedPhotoMatch:
    photo_id: str
    score_ratio: float
    score_percent: float
    rank: int


def collect_ranked_photo_matches(
    db: Session,
    *,
    event_id: str,
    selfie_embedding: list[float],
    threshold_percent: float,
    top_margin: float,
    relax_drop: float,
    relax_min_threshold: float,
    max_results: int = 120,
) -> tuple[list[RankedPhotoMatch], float, bool]:
    rows = db.execute(select(Face.photo_id, Face.embedding).where(Face.event_id == event_id)).all()
    if not rows:
        return [], float(threshold_percent), False

    photo_ids = [row[0] for row in rows]
    embeddings = [row[1] for row in rows]
    scores = batch_cosine_similarities(selfie_embedding, embeddings)

    best_percent_by_photo: dict[str, float] = defaultdict(float)
    for photo_id, cosine in zip(photo_ids, scores):
        percent = cosine_to_percent(float(cosine))
        if percent > best_percent_by_photo[photo_id]:
            best_percent_by_photo[photo_id] = percent

    candidates = sorted(best_percent_by_photo.items(), key=lambda item: item[1], reverse=True)
    strict = _select_with_threshold(candidates, threshold=float(threshold_percent), top_margin=float(top_margin))
    adaptive_used = False
    used_threshold = float(threshold_percent)

    if not strict and candidates:
        adaptive_used = True
        used_threshold = max(float(relax_min_threshold), float(threshold_percent) - max(0.0, float(relax_drop)))
        strict = _select_with_threshold(candidates, threshold=used_threshold, top_margin=max(10.0, float(top_margin)))

    limited = strict[: max(1, int(max_results))]
    ranked: list[RankedPhotoMatch] = []
    for idx, (photo_id, score_percent) in enumerate(limited, start=1):
        ranked.append(
            RankedPhotoMatch(
                photo_id=str(photo_id),
                score_percent=float(score_percent),
                score_ratio=float(score_percent / 100.0),
                rank=idx,
            )
        )
    return ranked, used_threshold, adaptive_used


def store_guest_results_from_ranked(
    db: Session,
    *,
    query: GuestQuery,
    ranked_matches: list[RankedPhotoMatch],
) -> list[GuestResult]:
    db.execute(delete(GuestResult).where(GuestResult.query_id == query.id))
    if not ranked_matches:
        db.flush()
        return []

    results: list[GuestResult] = []
    for item in ranked_matches:
        result = GuestResult(
            query_id=query.id,
            photo_id=item.photo_id,
            score=float(item.score_ratio),
            rank=int(item.rank),
        )
        db.add(result)
        results.append(result)
    db.flush()
    return results


def store_guest_results(
    db: Session,
    *,
    query: GuestQuery,
    event_id: str,
    cluster_label: int,
    selfie_embedding: list[float],
    limit: int = 80,
) -> list[GuestResult]:
    db.execute(delete(GuestResult).where(GuestResult.query_id == query.id))
    faces = (
        db.execute(select(Face).where(Face.event_id == event_id, Face.cluster_label == cluster_label))
        .scalars()
        .all()
    )
    if not faces:
        db.flush()
        return []

    best_by_photo: dict[str, float] = defaultdict(float)
    face_photo_ids = [face.photo_id for face in faces]
    embeddings = [face.embedding for face in faces]
    scores = batch_cosine_similarities(selfie_embedding, embeddings)
    for photo_id, score in zip(face_photo_ids, scores):
        if float(score) > best_by_photo[photo_id]:
            best_by_photo[photo_id] = float(score)

    ordered = sorted(best_by_photo.items(), key=lambda item: item[1], reverse=True)[: max(1, int(limit))]
    photo_map = {
        photo.id: photo
        for photo in db.execute(select(Photo).where(Photo.id.in_([photo_id for photo_id, _ in ordered]))).scalars().all()
    }
    results: list[GuestResult] = []
    for rank, (photo_id, score) in enumerate(ordered, start=1):
        if photo_id not in photo_map:
            continue
        item = GuestResult(query_id=query.id, photo_id=photo_id, score=float(score), rank=rank)
        db.add(item)
        results.append(item)

    db.flush()
    return results


def _select_with_threshold(
    ordered_candidates: list[tuple[str, float]],
    *,
    threshold: float,
    top_margin: float,
) -> list[tuple[str, float]]:
    selected = [item for item in ordered_candidates if float(item[1]) >= float(threshold)]
    if not selected:
        return []
    if top_margin <= 0:
        return selected
    best = float(selected[0][1])
    floor = max(float(threshold), best - float(top_margin))
    return [item for item in selected if float(item[1]) >= floor]
