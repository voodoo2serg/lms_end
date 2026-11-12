"""Inbound M2M AccessGrant sync: voronka → LMS enrollment (LMS-2).

Wire contract v1: dual-read EnrollmentBody + older resource/kind/revoke shape;
Bearer and/or HMAC (body-only or `{timestamp}.{body}`) under X-Voronka-* / X-Lms-*.
Money authority stays in voronka; LMS only applies desired/revoke.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import select

from app.db import Session, now
from app.learning_access import CANONICAL_CAPABILITY, CAPABILITY_ALIASES, is_external, normalize_capability, utc
from app.learning_models import AccessGrantRow, Course, Learner

router = APIRouter(prefix="/api/integrations/voronka", tags=["voronka-lms"])

SCHEMA_VERSION = 1
HMAC_MAX_SKEW_SECONDS = 300


class EnrollmentBody(BaseModel):
    """Canonical LMS enrollment apply body (after dual-read normalization)."""

    model_config = ConfigDict(extra="ignore")
    schema_version: int = Field(default=SCHEMA_VERSION, ge=1, le=1)
    event_id: str = Field(min_length=8, max_length=80)
    action: str = Field(pattern=r"^(desired|grant|revoke)$")
    keycloak_sub: str = Field(min_length=1, max_length=200)
    voronka_profile_id: str | None = Field(default=None, max_length=36)
    email: str | None = Field(default=None, max_length=250)
    name: str | None = Field(default=None, max_length=200)
    course_id: str | None = Field(default=None, max_length=80)
    commerce_product_id: str | None = Field(default=None, max_length=80)
    capability: str = Field(default=CANONICAL_CAPABILITY, max_length=40)
    min_paid_percent: int = Field(default=100, ge=0, le=100)
    expires_at: datetime | None = None
    revision: int = Field(default=1, ge=1)


def _header_ci(headers: dict[str, str], *names: str) -> str:
    lowered = {str(k).lower(): v for k, v in headers.items()}
    for name in names:
        value = lowered.get(name.lower())
        if value:
            return str(value).strip()
    return ""


def _normalize_signature(signature: str) -> str:
    sig = (signature or "").strip()
    if sig.lower().startswith("sha256="):
        return sig.split("=", 1)[1].strip()
    return sig


def _sign_body(secret: str, raw_body: bytes) -> str:
    return hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()


def _sign_timestamp_body(secret: str, raw_body: bytes, timestamp: str) -> str:
    return hmac.new(secret.encode(), f"{timestamp}.".encode() + raw_body, hashlib.sha256).hexdigest()


def _hmac_ok(secret: str, raw_body: bytes, timestamp: str, signature: str) -> bool:
    if not secret or not signature:
        return False
    actual = _normalize_signature(signature).lower()
    # Body-only (legacy LMS inbound).
    if hmac.compare_digest(_sign_body(secret, raw_body).lower(), actual):
        return True
    # Wire contract: `{timestamp}.{raw_body}` with skew ≤ 300s.
    if not timestamp:
        return False
    try:
        ts = int(timestamp)
    except (TypeError, ValueError):
        return False
    age = abs(int(now().timestamp()) - ts)
    if age > HMAC_MAX_SKEW_SECONDS:
        return False
    expected = _sign_timestamp_body(secret, raw_body, timestamp).lower()
    return hmac.compare_digest(expected, actual)


def _verify_m2m(request_headers: dict[str, str], raw_body: bytes) -> None:
    """Accept Bearer and/or HMAC under X-Voronka-* / X-Lms-* (body or timestamp.body)."""
    token = (os.getenv("VORONKA_LMS_TOKEN") or "").strip()
    secret = (os.getenv("VORONKA_LMS_HMAC_SECRET") or token or "").strip()
    if not token and not secret:
        raise HTTPException(503, "VORONKA_LMS_TOKEN or VORONKA_LMS_HMAC_SECRET required")

    auth = _header_ci(request_headers, "authorization")
    if token and auth.startswith("Bearer ") and hmac.compare_digest(auth[7:], token):
        return

    # Shared secret as Bearer (voronka delivery_headers style).
    if secret and auth.startswith("Bearer ") and hmac.compare_digest(auth[7:], secret):
        return

    ts = _header_ci(request_headers, "x-voronka-timestamp", "x-lms-timestamp")
    sig = _header_ci(request_headers, "x-voronka-signature", "x-lms-signature")
    if secret and _hmac_ok(secret, raw_body, ts, sig):
        return

    if not sig and not auth:
        raise HTTPException(401, "Bearer or X-Voronka-Signature / X-Lms-Signature required")
    raise HTTPException(401, "Invalid token or signature")


def _as_int(value: Any, default: int) -> int:
    if value is None or value == "":
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def normalize_enrollment_payload(raw: dict[str, Any]) -> dict[str, Any]:
    """Dual-read LMS EnrollmentBody and older voronka resource/kind/revoke shape."""
    if not isinstance(raw, dict):
        raise HTTPException(422, "Expected JSON object")

    event_id = str(raw.get("event_id") or raw.get("idempotency_key") or "").strip()
    kind = str(raw.get("kind") or raw.get("type") or "").strip()
    revoke_flag = raw.get("revoke")
    action_raw = str(raw.get("action") or "").strip().lower()

    if not action_raw:
        if revoke_flag is True or kind.endswith(".revoked") or kind == "revoke":
            action_raw = "revoke"
        elif kind.endswith(".desired") or kind in {"grant", "enrollment.desired"}:
            action_raw = "grant"
        else:
            action_raw = "desired"

    if action_raw == "grant":
        action = "desired"
    elif action_raw in {"desired", "revoke"}:
        action = action_raw
    else:
        raise HTTPException(422, "action must be grant|desired|revoke")

    course_id = str(raw.get("course_id") or "").strip() or None
    commerce_product_id = str(raw.get("commerce_product_id") or "").strip() or None
    resource = str(raw.get("resource") or "").strip() or None
    if not course_id and resource:
        course_id = resource
    if not course_id and not commerce_product_id and resource:
        commerce_product_id = resource

    keycloak_sub = str(raw.get("keycloak_sub") or "").strip()
    email = str(raw.get("email") or "").strip() or None
    voronka_profile_id = str(raw.get("voronka_profile_id") or "").strip() or None
    if not keycloak_sub:
        if email:
            keycloak_sub = f"email:{email.lower()}"
        elif voronka_profile_id:
            keycloak_sub = f"vp:{voronka_profile_id}"
        else:
            raise HTTPException(422, "keycloak_sub or email or voronka_profile_id required")

    schema_version = _as_int(raw.get("schema_version"), SCHEMA_VERSION)
    capability = str(raw.get("capability") or CANONICAL_CAPABILITY).strip() or CANONICAL_CAPABILITY

    return {
        "schema_version": schema_version,
        "event_id": event_id,
        "action": action,
        "keycloak_sub": keycloak_sub,
        "voronka_profile_id": voronka_profile_id,
        "email": email,
        "name": (str(raw.get("name") or "").strip() or None),
        "course_id": course_id,
        "commerce_product_id": commerce_product_id,
        "capability": capability,
        "min_paid_percent": _as_int(raw.get("min_paid_percent"), 100),
        "expires_at": raw.get("expires_at"),
        "revision": _as_int(raw.get("revision"), 1),
    }


def resolve_course(db, course_id: str | None, commerce_product_id: str | None) -> Course:
    course = None
    if course_id:
        course = db.get(Course, course_id)
    if not course and commerce_product_id:
        course = db.scalar(select(Course).where(
            (Course.commerce_product_id == commerce_product_id) | (Course.product_id == commerce_product_id)))
    if not course and course_id:
        # Older voronka shape used resource as commerce product id / binding key.
        course = db.scalar(select(Course).where(
            (Course.commerce_product_id == course_id) | (Course.product_id == course_id)))
    if not course or not course.active:
        raise HTTPException(404, "Course binding not found")
    return course


def grant_is_effective(grant: AccessGrantRow, course: Course) -> bool:
    if grant.revoked or not course.active:
        return False
    if grant.expires_at and utc(grant.expires_at) <= now():
        return False
    # Payment threshold is decided by voronka before push; LMS trusts the desired signal.
    return True


def latest_grant(db, keycloak_sub: str, course_id: str) -> AccessGrantRow | None:
    return db.scalar(
        select(AccessGrantRow)
        .where(
            AccessGrantRow.keycloak_sub == keycloak_sub,
            AccessGrantRow.course_id == course_id,
            AccessGrantRow.capability.in_(tuple(CAPABILITY_ALIASES)),
        )
        .order_by(AccessGrantRow.revision.desc(), AccessGrantRow.updated_at.desc())
        .limit(1)
    )


def grant_access_from_sync(db, learner: Learner, course: Course) -> bool:
    """Evaluate inbound grants for a learner/course (external authority)."""
    if not course.active:
        return False
    grant = latest_grant(db, learner.subject, course.id)
    return bool(grant and grant_is_effective(grant, course))


@router.post("/enrollment")
async def enrollment_sync(
    request: Request,
    authorization: str | None = Header(default=None),
    x_voronka_signature: str | None = Header(default=None, alias="X-Voronka-Signature"),
    x_voronka_timestamp: str | None = Header(default=None, alias="X-Voronka-Timestamp"),
    x_lms_signature: str | None = Header(default=None, alias="X-Lms-Signature"),
    x_lms_timestamp: str | None = Header(default=None, alias="X-Lms-Timestamp"),
):
    from app.learning_service import apply_enrollment_desired, audit, ensure_learner_external

    raw = await request.body()
    headers = {k: v for k, v in request.headers.items()}
    # Keep FastAPI-injected aliases available even if proxy strips casing oddly.
    if authorization and "authorization" not in {k.lower() for k in headers}:
        headers["authorization"] = authorization
    if x_voronka_signature:
        headers.setdefault("X-Voronka-Signature", x_voronka_signature)
    if x_voronka_timestamp:
        headers.setdefault("X-Voronka-Timestamp", x_voronka_timestamp)
    if x_lms_signature:
        headers.setdefault("X-Lms-Signature", x_lms_signature)
    if x_lms_timestamp:
        headers.setdefault("X-Lms-Timestamp", x_lms_timestamp)

    _verify_m2m(headers, raw)
    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(422, "Invalid JSON") from exc

    try:
        normalized = normalize_enrollment_payload(payload)
        body = EnrollmentBody.model_validate(normalized)
    except HTTPException:
        raise
    except ValidationError as exc:
        raise HTTPException(422, str(exc)) from None
    except Exception as exc:
        raise HTTPException(422, str(exc)) from None

    capability = normalize_capability(body.capability)
    if capability != CANONICAL_CAPABILITY:
        raise HTTPException(422, f"LMS enrollment capability must be {CANONICAL_CAPABILITY}")
    if body.expires_at is not None and body.expires_at.tzinfo is None:
        raise HTTPException(422, "expires_at must include timezone")
    if not body.course_id and not body.commerce_product_id:
        raise HTTPException(422, "course_id or commerce_product_id required")

    with Session.begin() as db:
        prior = db.get(AccessGrantRow, body.event_id)
        if prior:
            return {"ok": True, "idempotent": True, "event_id": body.event_id}

        course = resolve_course(db, body.course_id, body.commerce_product_id)
        current = latest_grant(db, body.keycloak_sub, course.id)
        if current and current.revision > body.revision:
            db.add(AccessGrantRow(
                id=body.event_id, keycloak_sub=body.keycloak_sub,
                voronka_profile_id=body.voronka_profile_id, course_id=course.id,
                commerce_product_id=body.commerce_product_id or course.commerce_product_id or course.product_id,
                capability=CANONICAL_CAPABILITY, min_paid_percent=body.min_paid_percent,
                expires_at=body.expires_at, revision=body.revision, revoked=True,
                payload={"ignored": "stale_revision", "action": body.action, "raw": payload},
                updated_at=now()))
            return {"ok": True, "ignored": "stale_revision", "event_id": body.event_id}

        learner = ensure_learner_external(
            db, subject=body.keycloak_sub, email=body.email or f"{body.keycloak_sub}@learners.local",
            name=body.name or body.keycloak_sub, voronka_profile_id=body.voronka_profile_id)

        revoked = body.action == "revoke"
        row = AccessGrantRow(
            id=body.event_id, keycloak_sub=body.keycloak_sub,
            voronka_profile_id=body.voronka_profile_id, course_id=course.id,
            commerce_product_id=body.commerce_product_id or course.commerce_product_id or course.product_id,
            capability=CANONICAL_CAPABILITY, min_paid_percent=body.min_paid_percent,
            expires_at=body.expires_at, revision=body.revision, revoked=revoked,
            payload={"normalized": body.model_dump(mode="json"), "raw": payload}, updated_at=now())
        db.add(row)
        db.flush()

        desired = (not revoked) and grant_is_effective(row, course)
        enrollment = apply_enrollment_desired(db, learner, course, desired, actor="voronka")
        audit(db, "grant.synced", "voronka", event_id=body.event_id, course_id=course.id,
              learner_id=learner.id, desired=desired, grant_action=body.action)
        return {
            "ok": True,
            "idempotent": False,
            "enrollment_id": enrollment.id,
            "desired": desired,
            "event_id": body.event_id,
            "authority": "external" if is_external() else "mixed",
        }
