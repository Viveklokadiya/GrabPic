from __future__ import annotations

from collections import Counter

import numpy as np
from sklearn.cluster import DBSCAN
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Face, FaceCluster


def normalize(vec: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vec))
    if norm <= 0:
        return vec
    return vec / norm


def cluster_event_faces(db: Session, *, event_id: str, eps: float, min_samples: int) -> int:
    faces = db.execute(select(Face).where(Face.event_id == event_id).order_by(Face.photo_id, Face.face_index)).scalars().all()
    db.execute(delete(FaceCluster).where(FaceCluster.event_id == event_id))
    if not faces:
        db.flush()
        return 0

    vectors = np.asarray([face.embedding for face in faces], dtype=np.float32)
    if vectors.shape[0] < min_samples:
        for face in faces:
            face.cluster_label = None
            db.add(face)
        db.flush()
        return 0

    labels = DBSCAN(eps=float(eps), min_samples=int(min_samples), metric="cosine").fit_predict(vectors)
    per_cluster: dict[int, list[Face]] = {}

    for idx, face in enumerate(faces):
        label = int(labels[idx])
        if label < 0:
            face.cluster_label = None
        else:
            face.cluster_label = label
            per_cluster.setdefault(label, []).append(face)
        db.add(face)

    for cluster_label, cluster_faces in per_cluster.items():
        centroid = normalize(np.mean(np.asarray([f.embedding for f in cluster_faces], dtype=np.float32), axis=0))
        by_photo = Counter([f.photo_id for f in cluster_faces])
        cover_photo_id = by_photo.most_common(1)[0][0] if by_photo else None
        cluster = FaceCluster(
            event_id=event_id,
            cluster_label=int(cluster_label),
            centroid=centroid.astype(np.float32).tolist(),
            face_count=len(cluster_faces),
            cover_photo_id=cover_photo_id,
        )
        db.add(cluster)

    db.flush()
    return len(per_cluster)

