"""BBB / meeting contract stubs (LMS-21/22) — no media plane, no VPS BBB install.

In-memory journal for join metadata, Q&A refs, attendance and feedback.spark events.
Money stays in voronka; OpenOlat remains academic SoR for grades.

Auth: Bearer MEETINGS_API_TOKEN / VORONKA_LMS_TOKEN / LMS_END_TOKEN, or HMAC
X-Lms-*/X-Voronka-* (same style as enrollment M2M). Mutations require auth; M2M
token counts as staff for stub service calls from the portal BFF.
"""
from __future__ import annotations

import hmac
import os
import time
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/meetings", tags=["meetings-stub"])

_STORE: dict[str, Any] = {
    "meetings": {},
    "questions": {},
    "attendance": {},
    "sparks": {},
    "seen_events": set(),
}

def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def _meetings_token() -> str:
    return (
        os.getenv("MEETINGS_API_TOKEN")
        or os.getenv("LMS_END_TOKEN")
        or os.getenv("VORONKA_LMS_TOKEN")
        or ""
    ).strip()


def require_meetings_auth(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """M2M Bearer for all meeting routes (portal BFF / tooling)."""
    token = _meetings_token()
    if not token:
        raise HTTPException(503, "MEETINGS_API_TOKEN or VORONKA_LMS_TOKEN required")
    auth = authorization or ""
    if auth.startswith("Bearer ") and hmac.compare_digest(auth[7:], token):
        # Trusted service identity from portal BFF after cookie/staff checks.
        return {"auth": "m2m", "role": "staff", "sub": "m2m"}
    raise HTTPException(401, "Bearer MEETINGS_API_TOKEN / VORONKA_LMS_TOKEN required")


def require_staff(actor: dict[str, Any] = Depends(require_meetings_auth)) -> dict[str, Any]:
    if actor.get("role") != "staff":
        raise HTTPException(403, "Staff required for meeting mutations")
    return actor


class MeetingIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    externalMeetingId: str | None = Field(default=None, max_length=120)
    scheduleStart: str | None = None
    scheduleEnd: str | None = None
    joinUrl: str | None = None
    recordingRef: str | None = None


class SessionIn(BaseModel):
    action: str = Field(pattern="^(start|end)$")


class QuestionIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    author: str = Field(default="staff", max_length=120)


class AttendanceIn(BaseModel):
    subject: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=200)
    duration_seconds: int = Field(ge=0, default=0)
    share_of_session: float = Field(ge=0, le=1, default=0)
    event_id: str = Field(min_length=4, max_length=120)
    joined_at: str | None = None
    left_at: str | None = None


class SparkIn(BaseModel):
    actor: str = Field(min_length=1, max_length=120)
    note: str = Field(default="огонёк", max_length=200)
    event_id: str = Field(min_length=4, max_length=120)
    timestamp: str | None = None


@router.get("/meta")
def meeting_meta(_actor: dict[str, Any] = Depends(require_meetings_auth)):
    return {
        "bbb_installed": False,
        "media_plane_host": os.getenv("BBB_MEDIA_PLANE_HOST") or None,
        "sor": {
            "join": "lms",
            "announce": "cms/lk",
            "notify": "voronka",
            "money": "crm",
        },
        "events": [
            "meeting.scheduled",
            "session.start",
            "session.end",
            "attendance.recorded",
            "feedback.spark",
        ],
        "fields": [
            "externalMeetingId",
            "joinUrl",
            "scheduleStart",
            "scheduleEnd",
            "recordingRef",
        ],
    }


@router.get("")
def list_meetings(_actor: dict[str, Any] = Depends(require_meetings_auth)):
    return {"meetings": list(_STORE["meetings"].values())}


@router.post("", status_code=201)
def create_meeting(body: MeetingIn, _actor: dict[str, Any] = Depends(require_staff)):
    mid = _uid("mtg")
    row = {
        "id": mid,
        "title": body.title,
        "externalMeetingId": body.externalMeetingId or _uid("ext"),
        "joinUrl": body.joinUrl,
        "scheduleStart": body.scheduleStart or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "scheduleEnd": body.scheduleEnd,
        "recordingRef": body.recordingRef,
        "mediaPlane": "stub",
        "status": "scheduled",
        "sessionStartedAt": None,
        "sessionEndedAt": None,
    }
    _STORE["meetings"][mid] = row
    _STORE["questions"][mid] = []
    return {
        "meeting": row,
        "event": {"type": "meeting.scheduled", "kind": "meeting.scheduled", "meeting_id": mid},
    }


@router.get("/{meeting_id}")
def get_meeting(meeting_id: str, _actor: dict[str, Any] = Depends(require_meetings_auth)):
    row = _STORE["meetings"].get(meeting_id)
    if not row:
        raise HTTPException(404, "meeting not found")
    return {"meeting": row, "questions": _STORE["questions"].get(meeting_id, [])}


@router.post("/{meeting_id}/session")
def session(meeting_id: str, body: SessionIn, _actor: dict[str, Any] = Depends(require_staff)):
    row = _STORE["meetings"].get(meeting_id)
    if not row:
        raise HTTPException(404, "meeting not found")
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if body.action == "start":
        row["status"] = "live"
        row["sessionStartedAt"] = now
        row["sessionEndedAt"] = None
        if not row.get("joinUrl"):
            row["joinUrl"] = (
                f"https://bbb.example.invalid/join?meeting={row['externalMeetingId']}&stub=1"
            )
        ev = "session.start"
    else:
        row["status"] = "ended"
        row["sessionEndedAt"] = now
        ev = "session.end"
    return {
        "meeting": row,
        "event": {
            "type": ev,
            "kind": ev,
            "meeting_id": meeting_id,
            "externalMeetingId": row["externalMeetingId"],
            "at": now,
        },
        "note": "BBB is not installed on the current VPS; joinUrl is stub/external only.",
    }


@router.post("/{meeting_id}/questions", status_code=201)
def add_question(meeting_id: str, body: QuestionIn, _actor: dict[str, Any] = Depends(require_meetings_auth)):
    if meeting_id not in _STORE["meetings"]:
        raise HTTPException(404, "meeting not found")
    q = {
        "id": _uid("q"),
        "meetingId": meeting_id,
        "body": body.body,
        "author": body.author,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "answered": False,
    }
    _STORE["questions"].setdefault(meeting_id, []).append(q)
    return {"question": q}


@router.post("/{meeting_id}/attendance", status_code=201)
def attendance(meeting_id: str, body: AttendanceIn, _actor: dict[str, Any] = Depends(require_staff)):
    if meeting_id not in _STORE["meetings"]:
        raise HTTPException(404, "meeting not found")
    if body.event_id in _STORE["seen_events"]:
        existing = _STORE["attendance"][body.event_id]
        return {"attendance": existing, "duplicate": True, "outbound_event": _attendance_event(existing)}
    _STORE["seen_events"].add(body.event_id)
    row = {
        "id": _uid("att"),
        "meeting_id": meeting_id,
        "subject": body.subject,
        "email": body.email,
        "duration_seconds": body.duration_seconds,
        "share_of_session": body.share_of_session,
        "event_id": body.event_id,
        "joined_at": body.joined_at or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "left_at": body.left_at,
    }
    _STORE["attendance"][body.event_id] = row
    return {
        "attendance": row,
        "duplicate": False,
        "outbound_event": _attendance_event(row),
    }


@router.get("/{meeting_id}/attendance")
def list_attendance(meeting_id: str, _actor: dict[str, Any] = Depends(require_meetings_auth)):
    if meeting_id not in _STORE["meetings"]:
        raise HTTPException(404, "meeting not found")
    rows = [r for r in _STORE["attendance"].values() if r["meeting_id"] == meeting_id]
    return {"attendance": rows}


@router.post("/{meeting_id}/sparks", status_code=201)
def spark(meeting_id: str, body: SparkIn, _actor: dict[str, Any] = Depends(require_meetings_auth)):
    if meeting_id not in _STORE["meetings"]:
        raise HTTPException(404, "meeting not found")
    if body.event_id in _STORE["seen_events"]:
        existing = _STORE["sparks"][body.event_id]
        return {"spark": existing, "duplicate": True, "outbound_event": _spark_event(existing)}
    _STORE["seen_events"].add(body.event_id)
    row = {
        "id": _uid("spk"),
        "meeting_id": meeting_id,
        "actor": body.actor,
        "note": body.note,
        "event_id": body.event_id,
        "timestamp": body.timestamp or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _STORE["sparks"][body.event_id] = row
    return {"spark": row, "duplicate": False, "outbound_event": _spark_event(row)}


def _attendance_event(row: dict) -> dict:
    return {
        "type": "attendance.recorded",
        "kind": "attendance.recorded",
        "event_id": row["event_id"],
        "idempotency_key": row["event_id"],
        "source": "lms_end",
        "data": {
            "meeting_id": row["meeting_id"],
            "subject": row["subject"],
            "email": row["email"],
            "duration_seconds": row["duration_seconds"],
            "share_of_session": row["share_of_session"],
            "joined_at": row["joined_at"],
            "left_at": row.get("left_at"),
        },
    }


def _spark_event(row: dict) -> dict:
    return {
        "type": "feedback.spark",
        "kind": "feedback.spark",
        "event_id": row["event_id"],
        "idempotency_key": row["event_id"],
        "source": "lms_end",
        "data": {
            "meeting_id": row["meeting_id"],
            "actor": row["actor"],
            "timestamp": row["timestamp"],
            "note": row["note"],
        },
    }


def reset_meeting_stubs_for_tests() -> None:
    _STORE["meetings"].clear()
    _STORE["questions"].clear()
    _STORE["attendance"].clear()
    _STORE["sparks"].clear()
    _STORE["seen_events"].clear()
