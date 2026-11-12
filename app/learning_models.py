"""Learning adapter state. OpenOlat owns academic records; voronka owns money.

External ids only — no ForeignKey into CRM money tables (LMS-3).
"""
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, JSON, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base, now


class Learner(Base):
    __tablename__ = "learning_users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    subject: Mapped[str] = mapped_column(String(200), unique=True)  # keycloak_sub
    # Soft reference to voronka CRM profile; never an FK into crm_profiles.
    profile_id: Mapped[str | None] = mapped_column(String(36), unique=True, nullable=True)
    voronka_profile_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(250))
    name: Mapped[str] = mapped_column(String(200))
    olat_id: Mapped[str | None] = mapped_column(String(40), unique=True, nullable=True)
    reminders: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Course(Base):
    __tablename__ = "learning_courses"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    # Soft tenant / product refs — no FK to projects / crm_products.
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    product_id: Mapped[str] = mapped_column(String(36), unique=True)
    commerce_product_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    olat_course_id: Mapped[str] = mapped_column(String(40))
    olat_group_id: Mapped[str] = mapped_column(String(40), unique=True)
    # Each course has an isolated RAGA endpoint and a server-side token env reference.
    raga_alias: Mapped[str] = mapped_column(String(120), default="")
    raga_token_env: Mapped[str] = mapped_column(String(120), default="")
    min_paid_percent: Mapped[int] = mapped_column(Integer, default=100)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Enrollment(Base):
    __tablename__ = "learning_enrollments"
    __table_args__ = (UniqueConstraint("learner_id", "course_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learning_users.id"))
    course_id: Mapped[str] = mapped_column(ForeignKey("learning_courses.id"))
    desired: Mapped[bool] = mapped_column(Boolean, default=False)
    state: Mapped[str] = mapped_column(String(30), default="pending")
    revision: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class LearningJob(Base):
    __tablename__ = "learning_jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    dedupe_key: Mapped[str] = mapped_column(String(240), unique=True)
    kind: Mapped[str] = mapped_column(String(40))
    target_id: Mapped[str] = mapped_column(String(80))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(24), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    error: Mapped[str] = mapped_column(String(100), default="")


class LearningNotice(Base):
    __tablename__ = "learning_notices"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learning_users.id"))
    course_id: Mapped[str | None] = mapped_column(ForeignKey("learning_courses.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Reminder(Base):
    __tablename__ = "learning_reminders"
    __table_args__ = (UniqueConstraint("learner_id", "external_key"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learning_users.id"))
    course_id: Mapped[str] = mapped_column(ForeignKey("learning_courses.id"))
    external_key: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(30))
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    state: Mapped[str] = mapped_column(String(24), default="scheduled")
    use_ai: Mapped[bool] = mapped_column(Boolean, default=False)


class AIUsage(Base):
    __tablename__ = "learning_ai_usage"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    actor_key: Mapped[str] = mapped_column(String(200), index=True)
    purpose: Mapped[str] = mapped_column(String(30))
    alias: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(24), default="reserved")
    # Reserve a conservative maximum in integer micro-USD; never a floating budget.
    reserved_micro_usd: Mapped[int] = mapped_column(Integer)
    tokens: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class LearningMessage(Base):
    __tablename__ = "learning_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learning_users.id"))
    course_id: Mapped[str] = mapped_column(ForeignKey("learning_courses.id"))
    request_key: Mapped[str] = mapped_column(String(100))
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text, default="")
    state: Mapped[str] = mapped_column(String(24), default="pending")
    __table_args__ = (UniqueConstraint("learner_id", "request_key"),)


class BotLink(Base):
    __tablename__ = "learning_bot_links"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learning_users.id"))
    # Soft ref to funnel connection — no FK (LMS-3 / freeze path).
    connection_id: Mapped[str] = mapped_column(String(36))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AccessGrantRow(Base):
    """Inbound voronka AccessGrant events (LMS-2). Idempotent by event_id (PK).

    Multiple events per learner/course are retained; effective access uses the
    highest revision (see grant_access_from_sync).
    """
    __tablename__ = "learning_access_grants"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)  # event_id
    keycloak_sub: Mapped[str] = mapped_column(String(200), index=True)
    voronka_profile_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    course_id: Mapped[str] = mapped_column(String(80), index=True)
    commerce_product_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    capability: Mapped[str] = mapped_column(String(40), default="course.view")
    min_paid_percent: Mapped[int] = mapped_column(Integer, default=100)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class OutboundEvent(Base):
    """Signed outbound facts to voronka (LMS-10). Commerce owns certificate policy."""
    __tablename__ = "learning_outbound_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    kind: Mapped[str] = mapped_column(String(40))
    dedupe_key: Mapped[str] = mapped_column(String(240), unique=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(24), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
