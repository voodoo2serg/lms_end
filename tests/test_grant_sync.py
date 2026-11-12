"""LMS-2 / LMS-3 / LMS-4: external grant sync without CRM money tables."""
import hashlib
import hmac
import json
import os
import time
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

import fakeredis
import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

from app.db import Base, now
from app import learning_models  # noqa: F401 — register tables
from app.learning_models import AccessGrantRow, Course, Enrollment, Learner, OutboundEvent, LearningJob
from app.learning_access import CANONICAL_CAPABILITY
from app import learning_api, learning_service, learning_grants, lms_app
from app.learning_auth import claims


LMS_TABLES = {
    "events",
    "learning_users",
    "learning_courses",
    "learning_enrollments",
    "learning_jobs",
    "learning_notices",
    "learning_reminders",
    "learning_ai_usage",
    "learning_messages",
    "learning_bot_links",
    "learning_access_grants",
    "learning_outbound_events",
}


@pytest.fixture
def lms(monkeypatch):
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    tables = [t for t in Base.metadata.sorted_tables if t.name in LMS_TABLES]
    Base.metadata.create_all(engine, tables=tables)
    factory = sessionmaker(engine, expire_on_commit=False)
    cache = fakeredis.FakeRedis(decode_responses=True)
    for mod in (learning_api, learning_service, learning_grants, lms_app):
        monkeypatch.setattr(mod, "Session", factory)
    monkeypatch.setenv("ACCESS_AUTHORITY", "external")
    monkeypatch.setenv("PLATFORM_PROJECT_ID", "tenant-1")
    monkeypatch.setenv("OIDC_AUDIENCE", "solo-api")
    monkeypatch.setenv("OPENOLAT_URL", "https://learn.example.ru")
    monkeypatch.setenv("VORONKA_LMS_TOKEN", "t" * 40)
    monkeypatch.setenv("VORONKA_LMS_HMAC_SECRET", "s" * 40)
    monkeypatch.setenv("AI_ENABLED", "0")
    with factory.begin() as db:
        db.add(Course(
            id="pr", project_id="tenant-1", product_id="prod-1", commerce_product_id="prod-1",
            title="Соло-PR", olat_course_id="101", olat_group_id="202",
            raga_alias="", raga_token_env="", min_paid_percent=100, active=True))
    claims_data = {
        "sub": "subject-one", "email": "anna@example.ru", "email_verified": True, "name": "Анна",
        "exp": time.time() + 300, "resource_access": {"solo-api": {"roles": ["owner"]}},
    }
    lms_app.app.dependency_overrides[claims] = lambda: claims_data
    client = TestClient(lms_app.app)
    yield SimpleNamespace(client=client, db=factory, cache=cache, claims=claims_data, engine=engine)
    lms_app.app.dependency_overrides.clear()
    client.close()
    engine.dispose()


def post_enrollment(client, body, token="t" * 40):
    return client.post(
        "/api/integrations/voronka/enrollment",
        content=json.dumps(body),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
    )


def base_body(**overrides):
    payload = {
        "schema_version": 1,
        "event_id": "evt-grant-001",
        "action": "desired",
        "keycloak_sub": "subject-one",
        "voronka_profile_id": "vp-1",
        "email": "anna@example.ru",
        "name": "Анна",
        "course_id": "pr",
        "commerce_product_id": "prod-1",
        "capability": CANONICAL_CAPABILITY,
        "min_paid_percent": 100,
        "expires_at": None,
        "revision": 1,
    }
    payload.update(overrides)
    return payload


def test_schema_has_no_crm_money_fks(lms):
    names = set(inspect(lms.engine).get_table_names())
    assert "crm_profiles" not in names and "crm_products" not in names and "crm_orders" not in names
    assert "learning_access_grants" in names and "learning_outbound_events" in names
    # Soft id columns exist without requiring CRM tables.
    cols = {c["name"] for c in inspect(lms.engine).get_columns("learning_users")}
    assert "voronka_profile_id" in cols and "subject" in cols


def test_grant_sync_idempotent_and_enrolls(lms):
    s = lms
    a = post_enrollment(s.client, base_body())
    b = post_enrollment(s.client, base_body())
    assert a.status_code == 200, a.text
    assert a.json()["desired"] is True and a.json()["idempotent"] is False
    assert b.json()["idempotent"] is True
    with s.db() as db:
        assert db.scalar(select(AccessGrantRow)).id == "evt-grant-001"
        enrollment = db.scalar(select(Enrollment))
        assert enrollment.desired is True and enrollment.state == "pending"
        assert db.scalar(select(LearningJob).where(LearningJob.kind == "enrollment")) is not None
        learner = db.scalar(select(Learner))
        assert learner.subject == "subject-one" and learner.voronka_profile_id == "vp-1"


def test_revoke_and_expiry_paths(lms):
    s = lms
    assert post_enrollment(s.client, base_body()).status_code == 200
    with s.db.begin() as db:
        e = db.scalar(select(Enrollment))
        e.state = "active"
    rev = post_enrollment(s.client, base_body(event_id="evt-revoke-002", action="revoke", revision=2))
    assert rev.status_code == 200 and rev.json()["desired"] is False
    with s.db() as db:
        assert db.scalar(select(Enrollment)).desired is False

    # Expired grant does not grant access even if action=desired.
    expired = (now() - timedelta(hours=1)).isoformat()
    assert post_enrollment(s.client, base_body(
        event_id="evt-exp-003", action="desired", revision=3, expires_at=expired)).status_code == 200
    with s.db() as db:
        learner, course = db.scalar(select(Learner)), db.scalar(select(Course))
        assert learning_service.paid_access(db, learner, course) is False


def test_stale_revision_ignored(lms):
    s = lms
    assert post_enrollment(s.client, base_body(revision=5)).status_code == 200
    stale = post_enrollment(s.client, base_body(event_id="evt-stale", action="revoke", revision=2))
    assert stale.status_code == 200 and stale.json().get("ignored") == "stale_revision"
    with s.db() as db:
        assert db.scalar(select(Enrollment)).desired is True


def test_checkout_gone_in_external_mode(lms):
    r = lms.client.post("/api/learning/checkout", json={"course_id": "pr", "request_key": "checkout-001"})
    assert r.status_code == 410


def test_course_enter_alias_accepted_on_evaluate(lms):
    """LMS-4: course.enter rows still satisfy course.view enrollment policy."""
    s = lms
    with s.db.begin() as db:
        db.add(Learner(id="L1", subject="subject-one", email="anna@example.ru", name="Анна",
                       profile_id="vp-1", voronka_profile_id="vp-1"))
        db.add(AccessGrantRow(
            id="evt-alias", keycloak_sub="subject-one", course_id="pr", capability="course.enter",
            min_paid_percent=100, revision=1, revoked=False, payload={}, updated_at=now()))
    with s.db() as db:
        learner, course = db.get(Learner, "L1"), db.get(Course, "pr")
        assert learning_service.paid_access(db, learner, course) is True


def test_outbound_transport_error_is_retryable(lms, monkeypatch):
    s = lms
    monkeypatch.setenv("VORONKA_COMPLETION_URL", "https://voronka.example.ru/hooks/lms")
    monkeypatch.setenv("VORONKA_LMS_HMAC_SECRET", "s" * 40)
    with s.db.begin() as db:
        learner = Learner(id="Lout", subject="sub-out", email="o@example.ru", name="O",
                          profile_id="vp", voronka_profile_id="vp")
        course = db.scalar(select(Course))
        db.add(learner)
        learning_service.queue_completion(db, learner, course, "done work", actor="owner")
    with s.db() as db:
        job = db.scalar(select(LearningJob).where(LearningJob.kind == "outbound"))
    with patch("httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.post.side_effect = httpx.ConnectTimeout("boom")
        with pytest.raises(learning_service.IntegrationError) as err:
            learning_service.deliver_outbound(job)
        assert err.value.retryable and err.value.code == "voronka_completion_transport"


def test_recover_interrupted_requeues_outbound(lms):
    s = lms
    with s.db.begin() as db:
        db.add(OutboundEvent(id="ob1", kind="learning.completed", dedupe_key="k1",
                             payload={}, status="pending"))
        db.add(LearningJob(id="job-ob", dedupe_key="outbound:ob1", kind="outbound",
                           target_id="ob1", status="running",
                           updated_at=now() - timedelta(minutes=10)))
        learning_service.recover_interrupted(db)
    with s.db() as db:
        job = db.get(LearningJob, "job-ob")
        assert job.status == "pending" and job.error == "worker_interrupted"
        assert db.get(OutboundEvent, "ob1").status == "pending"


def test_hmac_auth_and_completion_outbound(lms, monkeypatch):
    s = lms
    monkeypatch.delenv("VORONKA_LMS_TOKEN", raising=False)
    body = base_body(event_id="evt-hmac-1")
    raw = json.dumps(body).encode()
    sig = hmac.new(b"s" * 40, raw, hashlib.sha256).hexdigest()
    r = s.client.post("/api/integrations/voronka/enrollment", content=raw, headers={
        "Content-Type": "application/json", "X-Voronka-Signature": "sha256=" + sig})
    assert r.status_code == 200, r.text

    monkeypatch.setenv("VORONKA_COMPLETION_URL", "https://voronka.example.ru/api/integrations/lms/completion")
    monkeypatch.setenv("VORONKA_LMS_HMAC_SECRET", "s" * 40)
    with s.db.begin() as db:
        learner = db.scalar(select(Learner))
        course = db.scalar(select(Course))
        learning_service.queue_completion(db, learner, course, "homework portfolio done", actor="owner")
    with s.db() as db:
        job = db.scalar(select(LearningJob).where(LearningJob.kind == "outbound"))
        assert job is not None
        outbound = db.scalar(select(OutboundEvent))
        assert outbound.kind == "learning.completed"
    with patch("httpx.Client") as client_cls:
        instance = client_cls.return_value.__enter__.return_value
        instance.post.return_value.status_code = 200
        learning_service.deliver_outbound(job)
    with s.db() as db:
        assert db.scalar(select(OutboundEvent)).status == "delivered"
