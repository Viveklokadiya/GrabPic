from __future__ import annotations

import os
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings, get_settings, reload_settings
from app.db import Base, get_db
from app.main import create_app


@pytest.fixture()
def test_settings(tmp_path: Path) -> Settings:
    storage = tmp_path / "storage"
    storage.mkdir(parents=True, exist_ok=True)
    os.environ["STORAGE_ROOT"] = str(storage)
    os.environ["GOOGLE_DRIVE_API_KEY"] = "test-key"
    os.environ["PUBLIC_FRONTEND_URL"] = "http://localhost:3000"
    os.environ["ADMIN_DASHBOARD_KEY"] = ""
    return reload_settings()


@pytest.fixture()
def db_engine() -> Generator:
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def db_session(db_engine) -> Generator[Session, None, None]:
    session_local = sessionmaker(bind=db_engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = session_local()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_engine, test_settings: Settings) -> Generator[TestClient, None, None]:
    app = create_app()
    session_local = sessionmaker(bind=db_engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def override_get_db() -> Generator[Session, None, None]:
        session = session_local()
        try:
            yield session
            session.commit()
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = lambda: test_settings

    with TestClient(app) as test_client:
        yield test_client
