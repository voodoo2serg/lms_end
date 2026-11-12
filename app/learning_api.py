"""One-project authenticated learning API; no client-supplied identity or model."""
import os
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, func
from app.db import Session, now
from app.crm_service import uid
from app.learning_access import CANONICAL_CAPABILITY, is_external
from app.learning_models import Learner, Course, Enrollment, LearningJob, LearningNotice, Reminder, LearningMessage, AIUsage, BotLink
from app.learning_auth import claims, owner
from app.learning_service import enqueue, reconcile, has_access, audit, course_link, queue_completion, ensure_learner_external

router = APIRouter(prefix="/api/learning", tags=["learning"])

@router.post("/crm-session")
def crm_session(data=Depends(claims)):
    if is_external():
        raise HTTPException(410, "CRM session is not part of LMS-only runtime; use voronka CRM directly")
    from app.auth import oidc_admin, issue_session, cache, session_key
    admin = oidc_admin(data)
    token = issue_session(admin.telegram_id)
    cache.expire(session_key(token), min(300, max(1, int(data["exp"] - now().timestamp()))))
    return {"token": token}


class Body(BaseModel):
    model_config = ConfigDict(extra="forbid")


@router.get("/catalog")
def catalog(data=Depends(claims)):
    with Session() as db:
        pid = project(db)
        courses = list(db.scalars(select(Course).where(Course.project_id == pid, Course.active.is_(True))))
        if is_external():
            # Prices live in voronka; LMS only exposes course bindings for LK status/launch.
            return [{"id": c.id, "title": c.title, "commerce_product_id": c.commerce_product_id or c.product_id,
                     "price_minor": None, "currency": None, "checkout": "voronka"} for c in courses]
        from app.crm_models import Product
        rows = []
        for c in courses:
            product = db.get(Product, c.product_id)
            if product and product.active:
                rows.append({"id": c.id, "title": c.title, "price_minor": product.price_minor, "currency": product.currency})
        return rows


class CheckoutBody(Body):
    course_id: str = Field(max_length=80)
    request_key: str = Field(min_length=10, max_length=60)


@router.post("/checkout")
def checkout(body: CheckoutBody, data=Depends(claims)):
    if is_external():
        raise HTTPException(
            410,
            "LMS checkout removed: payment authority is voronka. "
            "solo_pr must call voronka commerce API; LMS receives AccessGrant via /api/integrations/voronka/enrollment",
        )
    import hashlib
    from app.db import Admin, Project
    from app.crm_models import Product, Order
    with Session.begin() as db:
        learner = learner_for(db, data)
        course = db.get(Course, body.course_id)
        product = db.get(Product, course.product_id) if course else None
        if not course or course.project_id != project(db) or not course.active or not product.active:
            raise HTTPException(404, "Курс не продаётся")
        key = "site:" + hashlib.sha256((learner.id + ":" + body.request_key).encode()).hexdigest()
        order = db.scalar(select(Order).where(Order.project_id == course.project_id, Order.request_key == key))
        if order and order.product_id != product.id:
            raise HTTPException(409, "Ключ уже использован")
        if not order:
            order = Order(id=uid(), project_id=course.project_id, profile_id=learner.profile_id,
                product_id=product.id, request_key=key, total_minor=product.price_minor, installments=[],
                snapshot={"name": product.name, "kind": product.kind, "price_minor": product.price_minor,
                    "catalog_price_minor": product.price_minor, "price_reason": "", "currency": product.currency,
                    "discount_minor": 0, "promo": "", "config": product.config})
            db.add(order); db.flush()
            audit(db, "order.created", data["sub"], order_id=order.id)
        order_id = order.id
        if order.total_minor == 0:
            reconcile(db)
            return {"order_id": order_id, "free": True}
        service_actor = db.get(Admin, int(os.environ["OWNER_TELEGRAM_ID"]))
        if not service_actor or not service_actor.active:
            raise HTTPException(503, "Продажи ещё не настроены")
    # Reuse the existing checked Robokassa implementation, never a browser amount.
    from app.crm_routers.commerce import checkout as payment_link
    result = payment_link(order_id, amount_minor=None, admin=service_actor)
    return {"order_id": order_id, **result}


def project(db):
    pid = os.getenv("PLATFORM_PROJECT_ID", "")
    if not pid:
        raise HTTPException(503, "Проект обучения не настроен")
    if is_external():
        return pid
    from app.db import Project
    if not db.get(Project, pid):
        raise HTTPException(503, "Проект обучения не настроен")
    return pid


def learner_for(db, data):
    pid = project(db)
    subject = data["sub"]
    if is_external():
        return ensure_learner_external(
            db, subject=subject, email=data.get("email", ""), name=data.get("name") or data.get("email") or subject)

    from app.crm_models import Profile
    from app.crm_service import create_profile
    row = db.scalar(select(Learner).where(Learner.subject == subject))
    if row:
        if row.profile_id:
            profile = db.get(Profile, row.profile_id)
            if profile and profile.project_id != pid:
                raise HTTPException(403, "Аккаунт другого проекта")
        return row
    email = data["email"].strip().lower()
    profiles = list(db.scalars(select(Profile).where(Profile.project_id == pid, func.lower(Profile.email) == email)))
    if len(profiles) > 1:
        raise HTTPException(409, "Нужно связать аккаунт с карточкой клиента у администратора")
    profile = profiles[0] if profiles else create_profile(db, pid, {"email": email,
        "name": data.get("name") or email, "source": "site-oidc"})
    if db.scalar(select(Learner).where(Learner.profile_id == profile.id)):
        raise HTTPException(409, "Карточка уже связана с другим аккаунтом")
    row = Learner(id=uid(), subject=subject, profile_id=profile.id, voronka_profile_id=profile.id,
                  email=email, name=(data.get("name") or email)[:200])
    db.add(row); db.flush()
    audit(db, "account.linked", subject, learner_id=row.id)
    return row


@router.get("/me")
def me(data=Depends(claims)):
    with Session.begin() as db:
        row = learner_for(db, data)
        roles = data.get("resource_access", {}).get(os.getenv("OIDC_AUDIENCE", "solo-api"), {}).get("roles", [])
        bots = []
        if not is_external():
            from app.db import Connection
            bots = [{"id": c.id, "name": c.name, "platform": c.platform} for c in db.scalars(select(Connection).where(
                Connection.project_id == project(db), Connection.active.is_(True), Connection.platform.in_(["telegram", "max"])))]
        return {"id": row.id, "subject": row.subject, "name": row.name, "email": row.email,
                "reminders": row.reminders, "ai_enabled": row.ai_enabled, "roles": roles, "bots": bots,
                "access_authority": "external" if is_external() else "legacy_crm",
                "canonical_capability": CANONICAL_CAPABILITY}


class BindBody(Body):
    connection_id: str = Field(max_length=36)


@router.post("/bindings")
def bot_link(body: BindBody, data=Depends(claims)):
    if is_external():
        raise HTTPException(410, "Bot binding is voronka's responsibility in LMS-only mode")
    import secrets, hashlib
    from datetime import timedelta
    from app.db import Connection
    with Session.begin() as db:
        user = learner_for(db, data)
        c = db.get(Connection, body.connection_id)
        if not c or not c.active or c.project_id != project(db) or c.platform not in {"telegram", "max"}:
            raise HTTPException(404, "Бот недоступен")
        username = c.config.get("username") or c.config.get("bot_username")
        if not username or not re.fullmatch(r"[A-Za-z0-9_]{3,100}", username):
            raise HTTPException(409, "Администратору нужно указать имя бота")
        for old in db.scalars(select(BotLink).where(BotLink.learner_id == user.id, BotLink.connection_id == c.id)):
            db.delete(old)
        raw = secrets.token_urlsafe(24)
        db.add(BotLink(token_hash=hashlib.sha256(raw.encode()).hexdigest(), learner_id=user.id,
            connection_id=c.id, expires_at=now()+timedelta(minutes=10)))
        host = "https://t.me/" if c.platform == "telegram" else "https://max.ru/"
        return {"url": host + username + "?start=link_" + raw}


@router.get("/dashboard")
def dashboard(data=Depends(claims)):
    with Session.begin() as db:
        learner = learner_for(db, data)
        reconcile(db); db.flush()
        courses = []
        for enrollment in db.scalars(select(Enrollment).where(Enrollment.learner_id == learner.id)):
            course = db.get(Course, enrollment.course_id)
            courses.append({"id": course.id, "title": course.title, "state": enrollment.state,
                "allowed": has_access(db, learner.id, course.id), "synced_at": enrollment.updated_at})
        notices = db.scalars(select(LearningNotice).where(LearningNotice.learner_id == learner.id)
            .order_by(LearningNotice.created_at.desc()).limit(30))
        return {"courses": courses, "notices": [{"id": n.id, "title": n.title, "body": n.body,
                "created_at": n.created_at} for n in notices], "reminders": learner.reminders, "ai_enabled": learner.ai_enabled}


class Preferences(Body):
    reminders: bool
    ai_enabled: bool


@router.put("/preferences")
def preferences(body: Preferences, data=Depends(claims)):
    with Session.begin() as db:
        row = learner_for(db, data)
        row.reminders, row.ai_enabled = body.reminders, body.ai_enabled
        audit(db, "preferences", data["sub"], reminders=body.reminders, ai_enabled=body.ai_enabled)
    return {"ok": True}


@router.post("/courses/{course_id}/launch")
def launch(course_id: str, data=Depends(claims)):
    with Session.begin() as db:
        row = learner_for(db, data)
        if not has_access(db, row.id, course_id):
            raise HTTPException(403, "Нет действующего доступа")
        enrollment = db.scalar(select(Enrollment).where(Enrollment.learner_id == row.id, Enrollment.course_id == course_id))
        if not enrollment or enrollment.state != "active":
            raise HTTPException(409, "Доступ подготавливается")
        return {"url": course_link(db.get(Course, course_id))}


class Chat(Body):
    course_id: str = Field(max_length=80)
    question: str = Field(min_length=1, max_length=4000)
    request_key: str = Field(min_length=10, max_length=100)


@router.post("/chat", status_code=202)
def chat(body: Chat, data=Depends(claims)):
    with Session.begin() as db:
        learner = learner_for(db, data)
        if not learner.ai_enabled or not has_access(db, learner.id, body.course_id):
            raise HTTPException(403, "Включите ИИ-помощника и проверьте доступ к курсу")
        old = db.scalar(select(LearningMessage).where(LearningMessage.learner_id == learner.id,
            LearningMessage.request_key == body.request_key))
        if old:
            if old.course_id != body.course_id or old.question != body.question:
                raise HTTPException(409, "Ключ запроса уже использован")
            return {"id": old.id, "state": old.state}
        # Bound the durable queue as well as actual provider calls.
        pending = db.scalar(select(func.count()).select_from(LearningMessage).where(
            LearningMessage.learner_id == learner.id, LearningMessage.state == "pending"))
        if pending >= 3:
            raise HTTPException(429, "Дождитесь ответа на предыдущие вопросы")
        row = LearningMessage(id=uid(), learner_id=learner.id, **body.model_dump())
        db.add(row); db.flush()
        enqueue(db, "chat", row.id, "chat:" + row.id)
        return {"id": row.id, "state": "pending"}


@router.get("/chat/{message_id}")
def answer(message_id: str, data=Depends(claims)):
    with Session.begin() as db:
        learner = learner_for(db, data)
        row = db.get(LearningMessage, message_id)
        if not row or row.learner_id != learner.id:
            raise HTTPException(404, "Сообщение не найдено")
        if not has_access(db, learner.id, row.course_id):
            raise HTTPException(403, "Доступ к курсу закрыт")
        return {"id": row.id, "state": row.state, "answer": row.answer}


class CourseBody(Body):
    id: str = Field(pattern=r"^[a-z0-9-]{1,80}$")
    product_id: str = Field(max_length=36)
    title: str = Field(min_length=1, max_length=200)
    olat_course_id: str = Field(pattern=r"^[0-9]{1,20}$")
    olat_group_id: str = Field(pattern=r"^[0-9]{1,20}$")
    raga_alias: str = Field(default="", max_length=120)
    raga_token_env: str = Field(default="", pattern=r"^(RAGA_[A-Z0-9_]+)?$")
    min_paid_percent: int = Field(default=100, ge=1, le=100)
    active: bool = True
    commerce_product_id: str | None = Field(default=None, max_length=36)


@router.put("/admin/courses")
def save_course(body: CourseBody, data=Depends(claims)):
    owner(data)
    with Session.begin() as db:
        pid = project(db)
        if not is_external():
            from app.crm_models import Product
            product = db.get(Product, body.product_id)
            if not product or product.project_id != pid:
                raise HTTPException(404, "Продукт недоступен")
        row = db.get(Course, body.id)
        payload = body.model_dump()
        commerce = payload.pop("commerce_product_id", None) or body.product_id
        if row:
            # Moving an assigned group would strand old membership. Migrate explicitly.
            if (row.olat_group_id != body.olat_group_id or row.product_id != body.product_id) and db.scalar(select(Enrollment.id).where(Enrollment.course_id == row.id)):
                raise HTTPException(409, "У курса есть назначения; смена группы/продукта требует миграции")
            for k, v in payload.items():
                setattr(row, k, v)
            row.commerce_product_id = commerce
        else:
            row = Course(project_id=pid, commerce_product_id=commerce, **payload)
            db.add(row)
        audit(db, "course.saved", data["sub"], course_id=row.id)
    return {"ok": True}


class ReminderBody(Body):
    learner_id: str = Field(max_length=36)
    course_id: str = Field(max_length=80)
    external_key: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=200)
    kind: str = Field(pattern=r"^(course|class|homework)$")
    due_at: datetime
    use_ai: bool = False


@router.post("/admin/reminders")
def reminder(body: ReminderBody, data=Depends(claims)):
    owner(data)
    if body.due_at.tzinfo is None:
        raise HTTPException(422, "Укажите часовой пояс")
    with Session.begin() as db:
        project(db)
        if not has_access(db, body.learner_id, body.course_id):
            raise HTTPException(403, "У слушателя нет доступа к курсу")
        old = db.scalar(select(Reminder).where(Reminder.learner_id == body.learner_id,
            Reminder.external_key == body.external_key))
        if old:
            return {"id": old.id, "state": old.state}
        row = Reminder(id=uid(), **body.model_dump()); db.add(row)
        audit(db, "reminder.created", data["sub"], reminder_id=row.id)
        return {"id": row.id, "state": "scheduled"}


@router.delete("/admin/reminders/{reminder_id}")
def cancel_reminder(reminder_id: str, data=Depends(claims)):
    owner(data)
    with Session.begin() as db:
        row = db.get(Reminder, reminder_id)
        if not row:
            raise HTTPException(404, "Не найдено")
        row.state = "cancelled"
        audit(db, "reminder.cancelled", data["sub"], reminder_id=row.id)
    return {"ok": True}


class CompleteBody(Body):
    learner_id: str = Field(max_length=36)
    course_id: str = Field(max_length=80)
    evidence: str = Field(min_length=5, max_length=2000)


@router.post("/admin/completion")
def mark_complete(body: CompleteBody, data=Depends(claims)):
    """LMS-10: attest academic completion; voronka decides certificate issuance."""
    owner(data)
    with Session.begin() as db:
        project(db)
        learner, course = db.get(Learner, body.learner_id), db.get(Course, body.course_id)
        if not learner or not course or course.project_id != project(db):
            raise HTTPException(404, "Слушатель или курс не найдены")
        row = queue_completion(db, learner, course, body.evidence, actor=data["sub"])
        return {"id": row.id, "status": row.status, "kind": row.kind}


@router.get("/admin")
def overview(data=Depends(claims)):
    owner(data)
    with Session() as db:
        pid = project(db)
        products = []
        if not is_external():
            from app.crm_models import Product
            products = [{"id": p.id, "name": p.name} for p in db.scalars(select(Product).where(Product.project_id == pid))]
        learners = list(db.scalars(select(Learner).where(
            (Learner.profile_id.is_not(None)) | (Learner.voronka_profile_id.is_not(None)) | (Learner.subject.is_not(None))
        ).limit(500)))
        if not is_external():
            from app.crm_models import Profile
            scoped = []
            for u in learners:
                if u.profile_id and (p := db.get(Profile, u.profile_id)) and p.project_id == pid:
                    scoped.append(u)
            learners = scoped
        else:
            learners = [u for u in db.scalars(select(Learner).limit(500))]
        return {"courses": [{"id": c.id, "title": c.title, "product_id": c.product_id,
            "commerce_product_id": c.commerce_product_id or c.product_id,
            "olat_course_id": c.olat_course_id, "olat_group_id": c.olat_group_id,
            "raga_alias": c.raga_alias, "active": c.active} for c in db.scalars(select(Course).where(Course.project_id == pid))],
            "products": products,
            "learners": [{"id": u.id, "name": u.name, "email": u.email} for u in learners],
            "jobs": [{"id": j.id, "kind": j.kind, "status": j.status, "attempts": j.attempts, "error": j.error}
                for j in db.scalars(select(LearningJob).order_by(LearningJob.updated_at.desc()).limit(100))],
            "ai_enabled": os.getenv("AI_ENABLED") == "1",
            "access_authority": "external" if is_external() else "legacy_crm",
            "canonical_capability": CANONICAL_CAPABILITY,
            "ai_reserved_micro_usd": db.scalar(select(func.coalesce(func.sum(AIUsage.reserved_micro_usd), 0)).where(
                AIUsage.created_at >= now().replace(hour=0, minute=0, second=0, microsecond=0)))}


@router.post("/admin/reconcile")
def sync(data=Depends(claims)):
    owner(data)
    with Session.begin() as db:
        project(db); reconcile(db)
    return {"ok": True}


@router.post("/admin/jobs/{job_id}/retry")
def retry_job(job_id: str, data=Depends(claims)):
    owner(data)
    with Session.begin() as db:
        row = db.get(LearningJob, job_id)
        if not row or row.status != "failed":
            raise HTTPException(409, "Задание не находится в ошибке")
        if row.kind not in {"enrollment", "outbound"}:
            raise HTTPException(409, "Платные ИИ-запросы повторяются новым обращением, а не скрытым повтором")
        row.status, row.error, row.due_at, row.attempts = "pending", "", now(), 0
        audit(db, "job.retry", data["sub"], job_id=row.id)
    return {"ok": True}
