from __future__ import annotations

from collections import deque
from typing import Any
from urllib.parse import quote, urlparse

import httpx


DRIVE_LIST_URL = "https://www.googleapis.com/drive/v3/files"
DRIVE_MEDIA_URL = "https://www.googleapis.com/drive/v3/files/{file_id}"
DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder"


def extract_drive_folder_id(input_value: str) -> str | None:
    raw = str(input_value or "").strip()
    if not raw:
        return None
    if _looks_like_drive_id(raw):
        return raw

    marker = "/folders/"
    if marker in raw:
        part = raw.split(marker, 1)[1].split("?", 1)[0].split("/", 1)[0]
        if _looks_like_drive_id(part):
            return part

    try:
        parsed = urlparse(raw)
        query = parsed.query or ""
        params = dict(item.split("=", 1) for item in query.split("&") if "=" in item)
        maybe = params.get("id", "")
        if _looks_like_drive_id(maybe):
            return maybe
    except Exception:
        return None
    return None


def build_content_stamp(file_item: dict[str, Any]) -> str:
    modified = str(file_item.get("modifiedTime") or "")
    size = str(file_item.get("size") or "")
    name = str(file_item.get("name") or "")
    return f"{modified}|{size}|{name}"


def list_public_drive_images(api_key: str, folder_id: str, max_images: int, timeout: float = 30.0) -> list[dict[str, Any]]:
    unlimited = max_images <= 0
    output: list[dict[str, Any]] = []
    visited: set[str] = set()
    pending: deque[str] = deque([folder_id])

    with httpx.Client(timeout=timeout, follow_redirects=True, headers={"User-Agent": "GrabPic/1.0"}) as client:
        while pending and (unlimited or len(output) < max_images):
            current = pending.popleft()
            if not current or current in visited:
                continue
            visited.add(current)

            next_page: str | None = None
            while unlimited or len(output) < max_images:
                page_size = 200 if unlimited else min(200, max(20, max_images - len(output)))
                params = {
                    "q": (
                        f"'{current}' in parents and trashed = false and "
                        f"(mimeType contains 'image/' or mimeType = '{DRIVE_FOLDER_MIME}')"
                    ),
                    "pageSize": str(page_size),
                    "fields": "nextPageToken, files(id,name,mimeType,webViewLink,modifiedTime,size)",
                    "supportsAllDrives": "true",
                    "includeItemsFromAllDrives": "true",
                    "key": api_key,
                }
                if next_page:
                    params["pageToken"] = next_page

                response = client.get(DRIVE_LIST_URL, params=params)
                if response.status_code != 200:
                    raise RuntimeError(f"Drive list API failed ({response.status_code}): {response.text[:220]}")
                payload = response.json()

                for item in payload.get("files", []):
                    file_id = str(item.get("id") or "")
                    mime_type = str(item.get("mimeType") or "")
                    if not file_id:
                        continue
                    if mime_type == DRIVE_FOLDER_MIME:
                        if file_id not in visited:
                            pending.append(file_id)
                        continue
                    if mime_type.startswith("image/"):
                        output.append(item)
                        if not unlimited and len(output) >= max_images:
                            break

                next_page = payload.get("nextPageToken")
                if not next_page:
                    break

    return output if unlimited else output[:max_images]


def download_public_drive_image(api_key: str, file_id: str, timeout: float = 60.0) -> bytes:
    candidate_urls = [
        f"{DRIVE_MEDIA_URL.format(file_id=quote(file_id))}?alt=media&key={quote(api_key)}",
        f"https://drive.usercontent.google.com/download?id={quote(file_id)}&export=download&confirm=t",
        f"https://drive.google.com/uc?export=download&id={quote(file_id)}",
        f"https://drive.google.com/thumbnail?id={quote(file_id)}&sz=w2200",
        f"https://lh3.googleusercontent.com/d/{quote(file_id)}=w2200",
    ]
    headers = {"User-Agent": "GrabPic/1.0", "Accept": "image/*,*/*;q=0.8"}
    with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
        for url in candidate_urls:
            response = client.get(url)
            if response.status_code != 200:
                continue
            content = response.content
            content_type = str(response.headers.get("content-type") or "").lower()
            if _looks_like_html(content, content_type):
                continue
            if _looks_like_image_bytes(content, content_type):
                return content
    raise RuntimeError(f"Could not download image for Drive file {file_id}")


def _looks_like_drive_id(value: str) -> bool:
    value = str(value or "").strip()
    if len(value) < 10:
        return False
    return all(ch.isalnum() or ch in "-_" for ch in value)


def _looks_like_html(content: bytes, content_type: str) -> bool:
    if "text/html" in (content_type or ""):
        return True
    prefix = (content or b"")[:320].lower()
    return b"<html" in prefix or b"<!doctype html" in prefix or b"<head" in prefix


def _looks_like_image_bytes(content: bytes, content_type: str) -> bool:
    if not content or len(content) < 12:
        return False
    ct = (content_type or "").strip().lower()
    if ct.startswith("image/"):
        return True
    return (
        content.startswith(b"\xff\xd8\xff")
        or content.startswith(b"\x89PNG\r\n\x1a\n")
        or content.startswith(b"RIFF")
        or content.startswith(b"GIF87a")
        or content.startswith(b"GIF89a")
        or content.startswith(b"BM")
    )

