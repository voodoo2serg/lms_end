# LMS-25 — Чеклист: CMS мероприятие → LMS meeting → voronka reminder

Операторский чеклист (без деплоя BBB).

## 1. CMS (solo_pr)

- [ ] Создать/открыть мероприятие
- [ ] Заполнить дату/время, описание, обложку
- [ ] Поля `externalMeetingId` / `bbbJoinUrl` (или `lmsLaunchUrl`-аналог) — когда wire в CMS готов (SPO-22)
- [ ] «Показывать на сайте» включено

## 2. LMS portal / adapter

- [ ] Создать meeting stub с тем же `externalMeetingId`
- [ ] Проверить schedule start/end
- [ ] Enrollment learners на связанный course = active
- [ ] `session.start` только когда media plane готов (сейчас stub joinUrl)
- [ ] Q&A / огоньки — опционально в эфире

## 3. Voronka

- [ ] Шаблон `meeting_reminder` (VOR-26) привязан к Identity аудитории с grant
- [ ] Не запускать BBB из бота — только DM/напоминание
- [ ] Outbox preflight ok

## 4. CRM

- [ ] После эфира: RO блок посещений ждёт `attendance.recorded` (CRM-7)
- [ ] Не писать оценки курса в CRM

## 5. Cutover host

- [ ] nginx `lms.solo-pr.ru` → portal + adapter upstreams ([deploy/nginx-lms.solo-pr.ru.conf](../deploy/nginx-lms.solo-pr.ru.conf))
- [ ] `compose.lms.yaml` healthy на home/target (не этот VPS-phase)
- [ ] solo_pr `LMS_*` заполнены
- [ ] Ping «meeting pipeline» в CMS Integrations (optional SPO-26)

## Запрещено в этом чеклисте

- `apt install` / docker BBB на текущем VPS
- Shared DB
