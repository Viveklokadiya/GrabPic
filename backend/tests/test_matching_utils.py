from __future__ import annotations

from types import SimpleNamespace

from app.services.matching import choose_best_cluster, cosine_similarity


def test_cosine_similarity_scores() -> None:
    assert abs(cosine_similarity([1, 0, 0], [1, 0, 0]) - 1.0) < 1e-6
    assert abs(cosine_similarity([1, 0, 0], [0, 1, 0]) - 0.0) < 1e-6


def test_choose_best_cluster_with_threshold() -> None:
    clusters = [
        SimpleNamespace(id="c1", cluster_label=1, centroid=[1.0, 0.0, 0.0]),
        SimpleNamespace(id="c2", cluster_label=2, centroid=[0.0, 1.0, 0.0]),
    ]
    best, confidence = choose_best_cluster([0.9, 0.1, 0.0], clusters, min_confidence=0.5)
    assert best is not None
    assert best.cluster_label == 1
    assert confidence > 0.8

    no_best, no_confidence = choose_best_cluster([0.1, 0.1, 0.98], clusters, min_confidence=0.7)
    assert no_best is None
    assert no_confidence < 0.7

