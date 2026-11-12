"""Thin LMS adapter FastAPI app (LMS-1 / LMS-5).

No CRM UI, no Robokassa checkout, no funnel webhooks. Money authority = voronka.
"""
import os
import time
from fastapi import FastAPI, HTTPException
from sqlalchemy import select
from app.db import Session
from app.learning_api import router as learning_router
from app.learning_grants import router as grants_router

app = FastAPI(title="LMS Adapter", docs_url=None, redoc_url=None)
app.include_router(learning_router)
app.include_router(grants_router)


@app.get("/health")
def health():
    with Session() as db:
        db.execute(select(1))
    # Prefer learning-worker heartbeat; redis is optional for readiness of DB-only probes.
    try:
        from app.auth import cache
        raw = cache.get("learning:heartbeat")
        age = time.time() - float(raw)
        if age > 200:
            raise HTTPException(503, "learning worker is stale")
        return {"status": "ok", "mode": "lms", "learning_worker_age_seconds": int(age),
                "access_authority": os.getenv("ACCESS_AUTHORITY", "external")}
    except HTTPException:
        raise
    except Exception:
        # DB up but worker/redis not yet — report degraded without failing cold start probes.
        return {"status": "degraded", "mode": "lms", "access_authority": os.getenv("ACCESS_AUTHORITY", "external")}


@app.get("/ready")
def ready():
    with Session() as db:
        db.execute(select(1))
    return {"ready": True, "mode": "lms"}
