from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = Field(default="GrabPic API")
    environment: str = Field(default="development")
    app_env: str = Field(default="local", validation_alias=AliasChoices("APP_ENV"))
    api_prefix: str = Field(default="/api/v1")
    database_url: str = Field(default="postgresql+psycopg://grabpic:grabpic@localhost:5432/grabpic")
    google_drive_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("GOOGLE_DRIVE_API_KEY", "GOOGLE_API_KEY"),
    )
    google_oauth_client_id: str = Field(
        default="",
        validation_alias=AliasChoices("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_CLIENT_ID"),
    )
    public_frontend_url: str = Field(default="http://localhost:3000")
    cors_allow_origins: str = Field(default="http://localhost:3000,http://127.0.0.1:3000")
    admin_dashboard_key: str = Field(default="", validation_alias=AliasChoices("ADMIN_DASHBOARD_KEY"))
    auth_session_ttl_hours: int = Field(default=24 * 14, validation_alias=AliasChoices("AUTH_SESSION_TTL_HOURS"))

    max_sync_images: int = Field(default=5000)
    thumbnail_max_size: int = Field(default=1200)
    selfie_retention_hours: int = Field(default=24)

    insightface_model: str = Field(default="buffalo_l")
    insightface_cpu_only: bool = Field(default=True)
    enable_ml_fallback: bool = Field(default=True)

    cluster_eps: float = Field(default=0.32)
    cluster_min_samples: int = Field(default=2)
    match_min_confidence: float = Field(default=0.58)
    face_similarity_threshold_percent: float = Field(
        default=90.0,
        validation_alias=AliasChoices("FACE_SIMILARITY_THRESHOLD"),
    )
    face_top_margin: float = Field(default=8.0, validation_alias=AliasChoices("FACE_TOP_MARGIN"))
    face_auto_relax_drop: float = Field(default=8.0, validation_alias=AliasChoices("FACE_AUTO_RELAX_DROP"))
    face_auto_relax_min_threshold: float = Field(
        default=78.0,
        validation_alias=AliasChoices("FACE_AUTO_RELAX_MIN_THRESHOLD"),
    )

    face_model_cache_dir: str = Field(
        default="~/.cache/drive-face-models",
        validation_alias=AliasChoices("FACE_MODEL_CACHE_DIR"),
    )
    face_det_size: int = Field(default=640, validation_alias=AliasChoices("FACE_DET_SIZE"))
    face_det_score_threshold: float = Field(
        default=0.78,
        validation_alias=AliasChoices("FACE_DET_SCORE_THRESHOLD", "FACE_DET_SCORE_THRESHOLD"),
    )
    face_min_face_ratio: float = Field(default=0.0014, validation_alias=AliasChoices("FACE_MIN_FACE_RATIO"))
    face_min_sharpness: float = Field(default=10.0, validation_alias=AliasChoices("FACE_MIN_SHARPNESS"))
    face_max_faces_per_image: int = Field(default=26, validation_alias=AliasChoices("FACE_MAX_FACES_PER_IMAGE"))
    face_resize_max_side: int = Field(default=2200, validation_alias=AliasChoices("FACE_RESIZE_MAX_SIDE"))

    job_poll_interval_seconds: int = Field(default=2)
    job_idle_sleep_seconds: int = Field(default=1)

    auto_sync_enabled: bool = Field(default=True, validation_alias=AliasChoices("AUTO_SYNC_ENABLED"))
    auto_sync_interval_minutes: int = Field(default=5, validation_alias=AliasChoices("AUTO_SYNC_INTERVAL_MINUTES"))
    auto_sync_batch_size: int = Field(default=4, validation_alias=AliasChoices("AUTO_SYNC_BATCH_SIZE"))
    worker_concurrency: int = Field(default=2, validation_alias=AliasChoices("WORKER_CONCURRENCY"))

    storage_root: str = Field(default="storage")

    @property
    def storage_root_path(self) -> Path:
        return Path(self.storage_root).resolve()

    @property
    def selfie_dir(self) -> Path:
        return self.storage_root_path / "selfies"

    @property
    def thumbnail_dir(self) -> Path:
        return self.storage_root_path / "thumbnails"

    @property
    def cors_allow_origins_list(self) -> list[str]:
        values = [item.strip() for item in str(self.cors_allow_origins or "").split(",")]
        return [item for item in values if item]

    @property
    def face_model_cache_dir_path(self) -> Path:
        return Path(self.face_model_cache_dir).expanduser().resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.storage_root_path.mkdir(parents=True, exist_ok=True)
    settings.selfie_dir.mkdir(parents=True, exist_ok=True)
    settings.thumbnail_dir.mkdir(parents=True, exist_ok=True)
    return settings


def reload_settings() -> Settings:
    get_settings.cache_clear()
    return get_settings()
