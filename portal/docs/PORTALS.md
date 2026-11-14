# Портал LMS · host `lms.solo-pr.ru`

| | |
|--|--|
| **Host** | `https://lms.solo-pr.ru` |
| **Repo** | `voodoo2serg/lms_end` → `portal/` |
| **SoR learning** | `voodoo2serg/lms_end` (OpenOlat + Keycloak + adapter) |
| **DNS/TLS** | ✅ (2026-11-14) A → `213.171.9.30` · LE |
| **VPS deploy this phase** | **Нет** — только код + nginx example |

## Поведение host (целевое)

1. **Сейчас / до LMS-20 cutover:** stub HTML или этот portal в stub-режиме (`LMS_END_URL` пуст) с честным empty-state «LMS выключен».
2. **После подъёма `compose.lms.yaml`:** nginx переключает upstream:
   - `/` → portal (этот сервис, порт 3040) **или** OpenOlat learn UI
   - `/api/integrations/`, `/api/learning/`, `/health` → lms_end adapter (`18080`)
   - `auth.solo-pr.ru` → Keycloak (отдельный vhost)
3. Cookie portal — **host-only** (`lms_portal_session`), без `Domain=.solo-pr.ru`.
4. Staff chrome: CMS · CRM · Воронка · LMS (только staff).
5. Публичное «Войти» ученика остаётся на `solo-pr.ru`; deep-link сюда / OpenOlat.

## Env

| Var | Meaning |
|-----|---------|
| `PORTAL_SESSION_SECRET` | HMAC for signed session cookie (≥16; required in production) |
| `LMS_END_URL` | Base URL adapter; пусто = local meeting store |
| `LMS_END_TOKEN` / `MEETINGS_API_TOKEN` | Bearer to adapter `/api/meetings` |
| `BBB_MEDIA_PLANE_HOST` | Future external BBB; **не** текущий VPS |
| `STUB_*` | Dev stub login |

Meeting UI calls only `/api/meetings/...` (questions/attendance/sparks nested) so one store.

## Анти-scope

- Shared Postgres с voronka/solo_pr
- BBB на текущем VPS
- Кнопка «создать оплату» в LMS
