from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    PHOTOGRAPHER = "PHOTOGRAPHER"
    GUEST = "GUEST"
