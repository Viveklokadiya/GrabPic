from __future__ import annotations

from app.utils.drive import build_content_stamp, extract_drive_folder_id


def test_extract_drive_folder_id_from_raw_id() -> None:
    assert extract_drive_folder_id("1AbCdEfghijkLmN") == "1AbCdEfghijkLmN"


def test_extract_drive_folder_id_from_folders_url() -> None:
    url = "https://drive.google.com/drive/folders/1abcDEF_12345?usp=sharing"
    assert extract_drive_folder_id(url) == "1abcDEF_12345"


def test_extract_drive_folder_id_from_query_url() -> None:
    url = "https://drive.google.com/open?id=1abcDEF_67890"
    assert extract_drive_folder_id(url) == "1abcDEF_67890"


def test_build_content_stamp_stable() -> None:
    item = {"modifiedTime": "2026-01-01T12:00:00Z", "size": "1111", "name": "img.jpg"}
    assert build_content_stamp(item) == "2026-01-01T12:00:00Z|1111|img.jpg"

