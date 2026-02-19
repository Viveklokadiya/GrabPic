from __future__ import annotations

from typing import Any

from sqlalchemy import JSON
from sqlalchemy.types import TypeDecorator

try:
    from pgvector.sqlalchemy import Vector
except Exception:  # pragma: no cover
    Vector = None


class EmbeddingVector(TypeDecorator):
    impl = JSON
    cache_ok = True

    def __init__(self, dimension: int = 512) -> None:
        super().__init__()
        self.dimension = int(dimension)

    def load_dialect_impl(self, dialect):  # type: ignore[override]
        if dialect.name == "postgresql" and Vector is not None:
            return dialect.type_descriptor(Vector(self.dimension))
        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value: Any, dialect):  # type: ignore[override]
        if value is None:
            return None
        values = [float(v) for v in value]
        if len(values) != self.dimension:
            raise ValueError(f"Expected embedding of size {self.dimension}, got {len(values)}")
        return values

    def process_result_value(self, value: Any, dialect):  # type: ignore[override]
        if value is None:
            return None
        if isinstance(value, str):
            raw = value.strip()
            if raw.startswith("[") and raw.endswith("]"):
                raw = raw[1:-1]
            if not raw:
                return []
            return [float(part.strip()) for part in raw.split(",") if part.strip()]
        return [float(v) for v in value]

