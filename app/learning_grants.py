"""Inbound M2M AccessGrant sync: voronka → LMS enrollment (LMS-2).

Versioned contract. Money authority stays in voronka; LMS only applies desired/revoke.
"""
from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from app.db import Session, now
from app.learning_access import CANONICAL_CAPABILITY, CAPABILITY_ALIASES, is_external, normalize_capability, utc
from app.learning_models import AccessGrantRow, Course, Learner

router = APIRouter(prefix="/api/integrations/voronka", tags=["voronka-lms"])

SCHEMA_VERSION = 1


class EnrollmentBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: int = Field(default=SCHEMA_VERSION, ge=1, le=1)
    event_id: str = Field(min_length=8, max_length=80)
    action: str = Field(pattern=r"^(desired|revoke)$")
    keycloak_sub: str = Field(min_length=1, max_length=200)
    voronka_profile_id: str | None = Field(default=None, max_length=36)
    email: str | None = Field(default=None, max_length=250)
    name: str | None = Field(default=None, max_length=200)
    course_id: str | None = Field(default=None, max_length=80)
    commerce_product_id: str | None = Field(default=None, max_length=36)
    capability: str = Field(default=CANONICAL_CAPABILITY, max_length=40)
    min_paid_percent: int = Field(default=100, ge=0, le=100)
    expires_at: datetime | None = None
    revision: int = Field(default=1, ge=1)


def _verify_m2m(authorization: str | None, signature: str | None, raw_body: bytes):
    token = (os.getenv("VORONKA_LMS_TOKEN") or "").strip()
    secret = (os.getenv("VORONKA_LMS_HMAC_SECRET") or "").strip()
    if not token and not secret:
        raise HTTPException(503, "VORONKA_LMS_TOKEN or VORONKA_LMS_HMAC_SECRET required")
    if token:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(401, "Bearer token required")
        if not hmac.compare_digest(authorization[7:], token):
            raise HTTPException(401, "Invalid token")
        return
    if not signature:
        raise HTTPException(401, "X-Voronka-Signature required")
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    supplied = signature.removeprefix("sha256=").strip()
    if not hmac.compare_digest(expected, supplied):
        raise HTTPException(401, "Invalid signature")


def resolve_course(db, course_id: str | None, commerce_product_id: str | None) -> Course:
    course = None
    if course_id:
        course = db.get(Course, course_id)
    if not course and commerce_product_id:
        course = db.scalar(select(Course).where(
            (Course.commerce_product_id == commerce_product_id) | (Course.product_id == commerce_product_id)))
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
):
    from app.learning_service import apply_enrollment_desired, audit, ensure_learner_external

    raw = await request.body()
    _verify_m2m(authorization, x_voronka_signature, raw)
    try:
        body = EnrollmentBody.model_validate_json(raw)
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
                payload={"ignored": "stale_revision", "action": body.action}, updated_at=now()))
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
            payload=body.model_dump(mode="json"), updated_at=now())
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
