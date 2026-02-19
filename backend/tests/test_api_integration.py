from __future__ import annotations

import io

from PIL import Image
from sqlalchemy.orm import Session

from app.auth import verify_secret
from app.models import Event, GuestQuery, Job


def _image_bytes() -> bytes:
    image = Image.new("RGB", (32, 32), color=(20, 200, 120))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_create_event_stores_hashed_tokens_and_initial_job(client, db_session: Session) -> None:
    payload = {
        "name": "Wedding Day",
        "drive_link": "https://drive.google.com/drive/folders/1abcDEF_12345",
    }
    response = client.post("/api/v1/events", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["event_id"]
    assert body["initial_job_id"]
    assert body["admin_token"]
    assert body["guest_code"]

    event = db_session.get(Event, body["event_id"])
    assert event is not None
    assert event.admin_token_hash != body["admin_token"]
    assert event.guest_code_hash != body["guest_code"]
    assert verify_secret(body["admin_token"], event.admin_token_hash)
    assert verify_secret(body["guest_code"], event.guest_code_hash)

    job = db_session.get(Job, body["initial_job_id"])
    assert job is not None
    assert job.job_type == "sync_event"


def test_resync_requires_admin_token(client, db_session: Session) -> None:
    event_response = client.post(
        "/api/v1/events",
        json={"name": "Portraits", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_22222"},
    )
    assert event_response.status_code == 201
    body = event_response.json()
    event_id = body["event_id"]

    unauth = client.post(f"/api/v1/events/{event_id}/resync")
    assert unauth.status_code == 401

    bad = client.post(
        f"/api/v1/events/{event_id}/resync",
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert bad.status_code == 403

    ok = client.post(
        f"/api/v1/events/{event_id}/resync",
        headers={"Authorization": f"Bearer {body['admin_token']}"},
    )
    assert ok.status_code == 202
    assert ok.json()["type"] == "sync_event"


def test_cancel_job_requires_valid_auth(client, db_session: Session) -> None:
    created = client.post(
        "/api/v1/events",
        json={"name": "Cancelable Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_cancel01"},
    )
    assert created.status_code == 201
    body = created.json()
    job_id = body["initial_job_id"]

    unauth = client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert unauth.status_code == 401

    bad = client.post(f"/api/v1/jobs/{job_id}/cancel", headers={"Authorization": "Bearer wrong-token"})
    assert bad.status_code == 403

    ok = client.post(f"/api/v1/jobs/{job_id}/cancel", headers={"Authorization": f"Bearer {body['admin_token']}"})
    assert ok.status_code == 200
    assert ok.json()["status"] == "canceled"

    job = db_session.get(Job, job_id)
    assert job is not None
    assert job.status == "canceled"


def test_cancel_running_job_sets_cancel_requested(client, db_session: Session) -> None:
    created = client.post(
        "/api/v1/events",
        json={"name": "Cancelable Running Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_cancel02"},
    )
    assert created.status_code == 201
    body = created.json()
    job_id = body["initial_job_id"]

    job = db_session.get(Job, job_id)
    assert job is not None
    job.status = "running"
    job.stage = "running"
    db_session.add(job)
    db_session.commit()

    response = client.post(f"/api/v1/jobs/{job_id}/cancel", headers={"Authorization": f"Bearer {body['admin_token']}"})
    assert response.status_code == 200
    assert response.json()["status"] == "cancel_requested"

    db_session.refresh(job)
    assert job.status == "cancel_requested"


def test_admin_key_can_cancel_event_job(client, db_session: Session, test_settings) -> None:
    test_settings.admin_dashboard_key = "dashboard-secret"
    created = client.post(
        "/api/v1/events",
        json={"name": "Admin Cancel Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_cancel03"},
    )
    assert created.status_code == 201
    job_id = created.json()["initial_job_id"]

    response = client.post(f"/api/v1/jobs/{job_id}/cancel", headers={"Authorization": "Bearer dashboard-secret"})
    assert response.status_code == 200
    assert response.json()["status"] == "canceled"


def test_guest_upload_and_status_flow(client, db_session: Session) -> None:
    created = client.post(
        "/api/v1/events",
        json={"name": "Guest Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_33333"},
    ).json()

    event = db_session.get(Event, created["event_id"])
    assert event is not None
    event.status = "ready"
    db_session.add(event)
    db_session.commit()

    resolved = client.post(
        "/api/v1/guest/events/resolve",
        json={"slug": created["slug"], "guest_code": created["guest_code"]},
    )
    assert resolved.status_code == 200

    selfie = _image_bytes()
    upload = client.post(
        "/api/v1/guest/matches",
        data={"slug": created["slug"], "guest_code": created["guest_code"]},
        files={"selfie": ("selfie.png", selfie, "image/png")},
    )
    assert upload.status_code == 202
    query_id = upload.json()["query_id"]

    pending = client.get(f"/api/v1/guest/matches/{query_id}")
    assert pending.status_code == 200
    assert pending.json()["status"] == "queued"

    query = db_session.get(GuestQuery, query_id)
    assert query is not None
    query.status = "completed"
    query.message = "No confident match found."
    query.confidence = 0.42
    db_session.add(query)
    db_session.commit()

    done = client.get(f"/api/v1/guest/matches/{query_id}")
    assert done.status_code == 200
    assert done.json()["status"] == "completed"
    assert done.json()["message"] == "No confident match found."


def test_admin_events_requires_configured_dashboard_key(client) -> None:
    response = client.get("/api/v1/admin/events")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "admin_dashboard_key_missing"


def test_admin_events_requires_auth_when_key_configured(client, test_settings) -> None:
    test_settings.admin_dashboard_key = "dashboard-secret"

    response = client.get("/api/v1/admin/events")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "admin_key_required"

    bad = client.get("/api/v1/admin/events", headers={"Authorization": "Bearer wrong"})
    assert bad.status_code == 403
    assert bad.json()["error"]["code"] == "invalid_admin_key"


def test_admin_events_returns_overview_when_authorized(client, test_settings) -> None:
    test_settings.admin_dashboard_key = "dashboard-secret"
    created = client.post(
        "/api/v1/events",
        json={"name": "Admin Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_99999"},
    )
    assert created.status_code == 201

    response = client.get("/api/v1/admin/events", headers={"Authorization": "Bearer dashboard-secret"})
    assert response.status_code == 200
    body = response.json()
    assert body["total_events"] >= 1
    assert isinstance(body["events"], list)
