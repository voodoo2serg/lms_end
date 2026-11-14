# Meetings / BBB stubs (LMS-21, LMS-22)

**BBB is not installed on the current VPS** (`213.171.9.30`). These routes define the join/Q&A/attendance/spark contract for the thin portal (`portal/` in this repo) and future external media plane.

## Placement

| Concern | Owner |
|---------|-------|
| Join URL / academic attendance journal | **lms_end** (this adapter) |
| Staff/learner UI | `portal/` → `lms.solo-pr.ru` |
| Event announce | solo_pr CMS / ЛК |
| Reminders | voronka (`meeting_reminder`) |
| Money / AccessGrant | voronka CRM |
| WebRTC / SFU | External BBB host (future) |

## HTTP (stubs, in-memory)

**Auth:** `Authorization: Bearer $MEETINGS_API_TOKEN` (or `VORONKA_LMS_TOKEN` / `LMS_END_TOKEN`). Mutations require staff-equivalent M2M.

| Method | Path |
|--------|------|
| GET | `/api/meetings/meta` |
| GET/POST | `/api/meetings` |
| GET | `/api/meetings/{id}` |
| POST | `/api/meetings/{id}/session` `{ "action": "start"\|"end" }` |
| POST | `/api/meetings/{id}/questions` |
| GET/POST | `/api/meetings/{id}/attendance` |
| POST | `/api/meetings/{id}/sparks` |

Outbound event names (dual `type`+`kind`): `meeting.scheduled`, `session.start`, `session.end`, `attendance.recorded`, `feedback.spark`.

Idempotency: `event_id` / `idempotency_key`. Sparks are feedback moments — **not** OpenOlat grades.

Env: `MEETINGS_API_TOKEN`, `BBB_MEDIA_PLANE_HOST` (optional future host).

## Portal BFF (same store)

Browser → `portal` `/api/meetings/*` only (cookie HMAC session). Portal either uses local store or delegates to this adapter with Bearer when `LMS_END_URL` is set. Nginx must not split questions/attendance to a different upstream than meetings.
