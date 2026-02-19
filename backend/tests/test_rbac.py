from __future__ import annotations


def _login(client, email: str, password: str = "password123") -> str:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def _create_event(client, token: str, name: str, slug: str) -> str:
    response = client.post(
        "/api/v1/events",
        json={
            "name": name,
            "slug": slug,
            "drive_link": "https://drive.google.com/drive/folders/1abcDEF_RBAC_TEST",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    return response.json()["event_id"]


def test_super_admin_can_access_any_event(client) -> None:
    photographer_token = _login(client, "studio1@grabpic.com")
    event_id = _create_event(client, photographer_token, "Studio One Event", "studio-one-event")

    super_admin_token = _login(client, "superadmin@grabpic.com")
    response = client.get(f"/api/v1/events/{event_id}", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert response.status_code == 200


def test_photographer_cannot_access_other_photographer_event(client) -> None:
    studio1_token = _login(client, "studio1@grabpic.com")
    event_id = _create_event(client, studio1_token, "Studio One Private Event", "studio-one-private")

    studio2_token = _login(client, "studio2@grabpic.com")
    response = client.get(f"/api/v1/events/{event_id}", headers={"Authorization": f"Bearer {studio2_token}"})
    assert response.status_code == 403


def test_guest_cannot_access_event_without_membership(client) -> None:
    photographer_token = _login(client, "studio1@grabpic.com")
    event_id = _create_event(client, photographer_token, "Membership Needed", "membership-needed")

    guest_token = _login(client, "guest1@grabpic.com")
    response = client.get(f"/api/v1/events/{event_id}", headers={"Authorization": f"Bearer {guest_token}"})
    assert response.status_code == 403


def test_guest_can_access_event_after_joining(client) -> None:
    photographer_token = _login(client, "studio1@grabpic.com")
    event_id = _create_event(client, photographer_token, "Join Then Access", "join-then-access")

    guest_token = _login(client, "guest1@grabpic.com")
    join_response = client.post(
        f"/api/v1/guest/events/{event_id}/join",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert join_response.status_code == 201

    response = client.get(f"/api/v1/events/{event_id}", headers={"Authorization": f"Bearer {guest_token}"})
    assert response.status_code == 200


def test_guest_cannot_access_photographer_processing_endpoints(client) -> None:
    photographer_token = _login(client, "studio1@grabpic.com")
    event_id = _create_event(client, photographer_token, "Processing Guard Event", "processing-guard-event")

    guest_token = _login(client, "guest1@grabpic.com")
    status_response = client.get(
        f"/api/v1/photographer/events/{event_id}/status",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert status_response.status_code == 403

    cancel_response = client.post(
        f"/api/v1/photographer/events/{event_id}/cancel",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert cancel_response.status_code == 403
