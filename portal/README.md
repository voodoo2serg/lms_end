# LMS portal (`lms_end/portal`)

Thin staff/learner UI for **https://lms.solo-pr.ru**.

Lives inside **lms_end** so the OpenOlat adapter remains SoR; this folder is UI + BBB stubs only.

| Контур | Роль |
|--------|------|
| **`portal/` (this)** | Staff/learner shell + meeting stubs |
| **`app/lms_app.py` + compose.lms** | OpenOlat + Keycloak + enrollment adapter |
| **voronka** | AccessGrant / деньги / reminders |
| **solo_pr** | Публичный ЛК + CMS анонсы |

> Empty `voodoo2serg/LMS_for_edu` was preferred for a separate repo, but push/create were denied for the agent token — portal ships here without touching adapter runtime paths beyond meeting stubs.

## Не в scope

- Деплой на VPS
- Установка BigBlueButton на `213.171.9.30`
- Касса / Robokassa

## Dev

```bash
cd portal
cp .env.example .env.local
npm ci
npm run dev   # http://127.0.0.1:3040
```

Stub login: `lms@solo-pr.ru` / `changeme` (staff), `learner@solo-pr.ru` / `changeme`.

```bash
npm test && npm run typecheck && npm run build
```

## Host wiring

- [docs/PORTALS.md](docs/PORTALS.md)
- [deploy/nginx-lms.solo-pr.ru.conf](../deploy/lms/nginx-lms.solo-pr.ru.conf) (repo root deploy)
- Checklist: [docs/MEETING_PIPELINE_CHECKLIST.md](docs/MEETING_PIPELINE_CHECKLIST.md)
- BBB contract: [docs/BBB_MEETINGS.md](docs/BBB_MEETINGS.md) · adapter: [../docs/MEETINGS.md](../docs/MEETINGS.md)
