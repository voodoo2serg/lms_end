"""LMS-21/22 meeting stubs — no BBB install; M2M auth required."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("ACCESS_AUTHORITY", "external")
os.environ.setdefault("OWNER_TELEGRAM_ID", "123")
os.environ["MEETINGS_API_TOKEN"] = "test-meetings-token"

from fastapi.testclient import TestClient

from app.lms_app import app
from app.meeting_stubs import reset_meeting_stubs_for_tests

AUTH = {"Authorization": "Bearer test-meetings-token"}


def client():
    reset_meeting_stubs_for_tests()
    return TestClient(app)


def test_meeting_requires_auth():
    c = client()
    assert c.get("/api/meetings/meta").status_code == 401
    assert c.get("/api/meetings").status_code == 401
    assert c.post("/api/meetings", json={"title": "x"}).status_code == 401


def test_meeting_meta_declares_no_bbb_on_vps():
    c = client()
    r = c.get("/api/meetings/meta", headers=AUTH)
    assert r.status_code == 200
    body = r.json()
    assert body["bbb_installed"] is False
    assert body["sor"]["join"] == "lms"
    assert body["sor"]["money"] == "crm"
    assert "attendance.recorded" in body["events"]
    assert "feedback.spark" in body["events"]


def test_meeting_session_and_idempotent_attendance_spark():
    c = client()
    created = c.post("/api/meetings", headers=AUTH, json={"title": "Demo"}).json()["meeting"]
    mid = created["id"]
    start = c.post(f"/api/meetings/{mid}/session", headers=AUTH, json={"action": "start"})
    assert start.status_code == 200
    assert start.json()["meeting"]["status"] == "live"
    assert "stub=1" in (start.json()["meeting"]["joinUrl"] or "")

    a1 = c.post(
        f"/api/meetings/{mid}/attendance",
        headers=AUTH,
        json={
            "subject": "kc-1",
            "email": "a@ex.ru",
            "duration_seconds": 120,
            "share_of_session": 0.4,
            "event_id": "evt-a-1",
        },
    )
    assert a1.status_code == 201
    assert a1.json()["outbound_event"]["type"] == "attendance.recorded"
    a2 = c.post(
        f"/api/meetings/{mid}/attendance",
        headers=AUTH,
        json={
            "subject": "kc-1",
            "email": "a@ex.ru",
            "duration_seconds": 999,
            "share_of_session": 1,
            "event_id": "evt-a-1",
        },
    )
    assert a2.status_code == 201
    assert a2.json()["duplicate"] is True
    assert a2.json()["attendance"]["duration_seconds"] == 120

    s1 = c.post(
        f"/api/meetings/{mid}/sparks",
        headers=AUTH,
        json={"actor": "staff", "event_id": "evt-s-1", "note": "огонёк"},
    )
    assert s1.status_code == 201
    assert s1.json()["outbound_event"]["kind"] == "feedback.spark"
    s2 = c.post(
        f"/api/meetings/{mid}/sparks",
        headers=AUTH,
        json={"actor": "staff", "event_id": "evt-s-1"},
    )
    assert s2.json()["duplicate"] is True

    q = c.post(
        f"/api/meetings/{mid}/questions",
        headers=AUTH,
        json={"body": "Как сдать?", "author": "anna"},
    )
    assert q.status_code == 201
    got = c.get(f"/api/meetings/{mid}", headers=AUTH)
    assert len(got.json()["questions"]) == 1
