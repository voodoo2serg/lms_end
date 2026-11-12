"""Durable site lead ingestion, separate credential from user authentication."""
import hashlib
import hmac
import json
import os
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import String, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base, Session
from app.crm_service import create_profile
from app.learning_service import audit


class SiteReceipt(Base):
    __tablename__ = "learning_site_receipts"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    digest: Mapped[str] = mapped_column(String(64))
    profile_id: Mapped[str] = mapped_column(ForeignKey("crm_profiles.id"))
    evidence: Mapped[dict] = mapped_column(JSON)


class Lead(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(max_length=200)
    contact_type: str = Field(pattern=r"^(email|telegram|max)$")
    contact: str = Field(min_length=1, max_length=250)
    topic: str = Field(max_length=250)
    consent: str = Field(min_length=1, max_length=2000)
    ads_consent: bool = False
    created: str = Field(max_length=60)


router = APIRouter()


@router.post("/api/integrations/site/leads")
def lead(body: Lead, authorization: str = Header(default="")):
    secret = os.getenv("SITE_BRIDGE_TOKEN", "")
    if len(secret) < 32 or not hmac.compare_digest(authorization, "Bearer " + secret):
        raise HTTPException(401, "Неверный ключ сайта")
    from app.learning_api import project
    digest = hashlib.sha256(json.dumps(body.model_dump(), sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    with Session.begin() as db:
        pid = project(db)
        old = db.get(SiteReceipt, body.id)
        if old:
            if old.digest != digest:
                raise HTTPException(409, "Идентификатор заявки уже использован")
            return {"id": old.id, "profile_id": old.profile_id}
        # A public form is not proof of account ownership or permission to start a bot chat.
        profile = create_profile(db, pid, {"name": body.name or body.contact,
            "email": body.contact if body.contact_type == "email" else "", "source": "solo-pr-site",
            "extra": {"preferred_contact_type": body.contact_type, "preferred_contact": body.contact,
                      "request_topic": body.topic, "ads_consent": body.ads_consent}})
        db.add(SiteReceipt(id=body.id, digest=digest, profile_id=profile.id, evidence=body.model_dump()))
        audit(db, "site.lead", "site", profile_id=profile.id, receipt_id=body.id)
        return {"id": body.id, "profile_id": profile.id}
