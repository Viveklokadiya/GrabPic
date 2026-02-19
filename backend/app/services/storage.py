from __future__ import annotations

from pathlib import Path

from PIL import Image

from app.config import Settings


def save_thumbnail(
    settings: Settings,
    event_id: str,
    drive_file_id: str,
    image_bytes: bytes,
    max_size: int,
) -> str:
    output_dir = settings.thumbnail_dir / event_id
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"{_safe_name(drive_file_id)}.jpg"

    with Image.open(__import__("io").BytesIO(image_bytes)) as image:
        image = image.convert("RGB")
        image.thumbnail((max_size, max_size))
        image.save(output_file, format="JPEG", quality=84, optimize=True)
    return str(output_file.relative_to(settings.storage_root_path)).replace("\\", "/")


def save_selfie(settings: Settings, query_id: str, file_name: str, payload: bytes) -> str:
    ext = Path(file_name or "selfie.jpg").suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        ext = ".jpg"
    settings.selfie_dir.mkdir(parents=True, exist_ok=True)
    path = settings.selfie_dir / f"{_safe_name(query_id)}{ext}"
    path.write_bytes(payload)
    return str(path.relative_to(settings.storage_root_path)).replace("\\", "/")


def to_absolute_path(settings: Settings, relative_path: str) -> Path:
    clean = str(relative_path or "").replace("\\", "/").strip("/")
    return settings.storage_root_path / clean


def delete_if_exists(settings: Settings, relative_path: str) -> None:
    path = to_absolute_path(settings, relative_path)
    try:
        if path.exists():
            path.unlink()
    except Exception:
        return


def _safe_name(value: str) -> str:
    cleaned = "".join(ch for ch in str(value or "") if ch.isalnum() or ch in ("-", "_"))
    return cleaned or "item"

