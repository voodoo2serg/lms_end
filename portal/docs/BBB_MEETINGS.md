# BBB / meetings — UI & API plan (no install)

**Инфра:** BigBlueButton **не** ставится на `213.171.9.30`. Media plane — отдельный host (future).

## Поля встречи (контракт)

| Field | Owner | Notes |
|-------|-------|-------|
| `externalMeetingId` | LMS | Stable id для BBB/OL meeting |
| `joinUrl` | LMS | Stub или URL внешнего media plane |
| `scheduleStart` / `scheduleEnd` | LMS (+ CMS announce) | Timing |
| `recordingRef` | LMS | Ссылка на запись (позже) |
| `bbbJoinUrl` / `externalMeetingId` на CMS мероприятии | solo_pr | Анонс + deep-link |

## События (wire names)

| Event | Emitter | Consumer |
|-------|---------|----------|
| `meeting.scheduled` | LMS portal / adapter | CMS/voronka optional |
| `session.start` / `session.end` | LMS | Timing stats |
| `attendance.recorded` | LMS | CRM RO (CRM-7) |
| `feedback.spark` | LMS | CRM/analytics; **не** gradebook |

Идемпотентность: `event_id` + `idempotency_key` (dual).

## Карта размещения

| Concern | System |
|---------|--------|
| Join / academic attendance | **LMS** |
| Анонс карточки | **CMS / ЛК** |
| Напоминание «через N мин» | **voronka** Outbox |
| Деньги / грант | **CRM (voronka)** |
| WebRTC/SFU | **External BBB host** |

## Portal API (этот репо)

| Method | Path |
|--------|------|
| GET/POST | `/api/meetings` |
| POST | `/api/meetings/{id}/session` `{action: start\|end}` |
| GET/POST | `/api/questions` |
| GET/POST | `/api/attendance` |
| GET/POST | `/api/sparks` |

Зеркальные stub-роуты в adapter — см. [`../../docs/MEETINGS.md`](../../docs/MEETINGS.md).
