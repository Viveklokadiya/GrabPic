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


def _login(client, email: str = "studio1@grabpic.com", password: str = "password123") -> str:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_create_event_stores_hashed_tokens_and_initial_job(client, db_session: Session) -> None:
    access_token = _login(client)
    payload = {
        "name": "Wedding Day",
        "drive_link": "https://drive.google.com/drive/folders/1abcDEF_12345",
    }
    response = client.post("/api/v1/events", json=payload, headers={"Authorization": f"Bearer {access_token}"})
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


def test_resync_requires_valid_session(client, db_session: Session) -> None:
    access_token = _login(client)
    event_response = client.post(
        "/api/v1/events",
        json={"name": "Portraits", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_22222"},
        headers={"Authorization": f"Bearer {access_token}"},
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
    assert bad.status_code == 401

    owner_token = _login(client, "studio1@grabpic.com")
    ok = client.post(
        f"/api/v1/events/{event_id}/resync",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert ok.status_code == 202
    assert ok.json()["type"] == "sync_event"


def test_cancel_job_requires_valid_session(client, db_session: Session) -> None:
    access_token = _login(client)
    created = client.post(
        "/api/v1/events",
        json={"name": "Cancelable Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_cancel01"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert created.status_code == 201
    body = created.json()
    job_id = body["initial_job_id"]

    unauth = client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert unauth.status_code == 401

    bad = client.post(f"/api/v1/jobs/{job_id}/cancel", headers={"Authorization": "Bearer wrong-token"})
    assert bad.status_code == 401

    ok = client.post(f"/api/v1/jobs/{job_id}/cancel", headers={"Authorization": f"Bearer {access_token}"})
    assert ok.status_code == 200
    assert ok.json()["status"] == "canceled"

    job = db_session.get(Job, job_id)
    assert job is not None
    assert job.status == "canceled"


def test_cancel_running_job_sets_cancel_requested(client, db_session: Session) -> None:
    access_token = _login(client)
    created = client.post(
        "/api/v1/events",
        json={"name": "Cancelable Running Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_cancel02"},
        headers={"Authorization": f"Bearer {access_token}"},
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

    response = client.post(f"/api/v1/jobs/{job_id}/cancel", headers={"Authorization": f"Bearer {access_token}"})
    assert response.status_code == 200
    assert response.json()["status"] == "cancel_requested"

    db_session.refresh(job)
    assert job.status == "cancel_requested"


def test_super_admin_can_cancel_any_event_job(client, db_session: Session) -> None:
    owner_token = _login(client, "studio1@grabpic.com")
    created = client.post(
        "/api/v1/events",
        json={"name": "Admin Cancel Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_cancel03"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert created.status_code == 201
    job_id = created.json()["initial_job_id"]

    super_admin_token = _login(client, "superadmin@grabpic.com")
    response = client.post(f"/api/v1/jobs/{job_id}/cancel", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert response.status_code == 200
    assert response.json()["status"] == "canceled"


def test_guest_upload_and_status_flow(client, db_session: Session) -> None:
    access_token = _login(client)
    created = client.post(
        "/api/v1/events",
        json={"name": "Guest Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_33333"},
        headers={"Authorization": f"Bearer {access_token}"},
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


def test_guest_flow_works_without_guest_code(client, db_session: Session) -> None:
    access_token = _login(client)
    created = client.post(
        "/api/v1/events",
        json={"name": "Guest No Code Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_no_code"},
        headers={"Authorization": f"Bearer {access_token}"},
    ).json()

    event = db_session.get(Event, created["event_id"])
    assert event is not None
    event.status = "ready"
    db_session.add(event)
    db_session.commit()

    resolved = client.post(
        "/api/v1/guest/events/resolve",
        json={"slug": created["slug"]},
    )
    assert resolved.status_code == 200

    selfie = _image_bytes()
    upload = client.post(
        "/api/v1/guest/matches",
        data={"slug": created["slug"]},
        files={"selfie": ("selfie.png", selfie, "image/png")},
    )
    assert upload.status_code == 202


def test_guest_join_link_by_slug(client, db_session: Session) -> None:
    studio_token = _login(client, "studio1@grabpic.com")
    created = client.post(
        "/api/v1/events",
        json={"name": "Invite Join Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_join_slug"},
        headers={"Authorization": f"Bearer {studio_token}"},
    )
    assert created.status_code == 201
    slug = created.json()["slug"]

    guest_token = _login(client, "guest1@grabpic.com")
    join_response = client.post(
        "/api/v1/guest/events/join-link",
        json={"slug": slug},
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert join_response.status_code == 201
    assert join_response.json()["event_id"] == created.json()["event_id"]


def test_admin_events_requires_authentication(client) -> None:
    response = client.get("/api/v1/admin/events")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "not_authenticated"


def test_admin_events_rejects_invalid_token(client) -> None:
    response = client.get("/api/v1/admin/events")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "not_authenticated"

    bad = client.get("/api/v1/admin/events", headers={"Authorization": "Bearer wrong"})
    assert bad.status_code == 401
    assert bad.json()["error"]["code"] == "invalid_token"


def test_admin_events_returns_overview_when_authorized(client) -> None:
    access_token = _login(client, "studio1@grabpic.com")
    created = client.post(
        "/api/v1/events",
        json={"name": "Admin Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_99999"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert created.status_code == 201

    admin_token = _login(client, "superadmin@grabpic.com")
    response = client.get("/api/v1/admin/events", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["total_events"] >= 1
    assert isinstance(body["events"], list)


def test_photographer_event_status_and_cancel(client, db_session: Session) -> None:
    studio_token = _login(client, "studio1@grabpic.com")
    created = client.post(
        "/api/v1/events",
        json={"name": "Status Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_status01"},
        headers={"Authorization": f"Bearer {studio_token}"},
    )
    assert created.status_code == 201
    event_id = created.json()["event_id"]
    job_id = created.json()["initial_job_id"]

    job = db_session.get(Job, job_id)
    assert job is not None
    job.status = "running"
    job.progress_percent = 42.0
    job.payload = {"total_listed": 10, "completed": 4, "failures": 1}
    db_session.add(job)
    db_session.commit()

    status_response = client.get(
        f"/api/v1/photographer/events/{event_id}/status",
        headers={"Authorization": f"Bearer {studio_token}"},
    )
    assert status_response.status_code == 200
    body = status_response.json()
    assert body["status"] == "RUNNING"
    assert body["processed_photos"] == 4
    assert body["total_photos"] == 10
    assert body["failed_photos"] == 1

    cancel_response = client.post(
        f"/api/v1/photographer/events/{event_id}/cancel",
        headers={"Authorization": f"Bearer {studio_token}"},
    )
    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == "CANCELLED"


def test_admin_events_status_and_cancel(client, db_session: Session) -> None:
    studio_token = _login(client, "studio1@grabpic.com")
    created = client.post(
        "/api/v1/events",
        json={"name": "Admin Status Event", "drive_link": "https://drive.google.com/drive/folders/1abcDEF_status02"},
        headers={"Authorization": f"Bearer {studio_token}"},
    )
    assert created.status_code == 201
    event_id = created.json()["event_id"]
    job_id = created.json()["initial_job_id"]

    job = db_session.get(Job, job_id)
    assert job is not None
    job.status = "running"
    job.progress_percent = 15.0
    job.payload = {"total_listed": 20, "completed": 3, "failures": 0}
    db_session.add(job)
    db_session.commit()

    admin_token = _login(client, "superadmin@grabpic.com")
    status_response = client.get("/api/v1/admin/events/status", headers={"Authorization": f"Bearer {admin_token}"})
    assert status_response.status_code == 200
    rows = status_response.json()
    assert any(row["event_id"] == event_id for row in rows)

    cancel_response = client.post(
        f"/api/v1/admin/events/{event_id}/cancel",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == "CANCELLED"
