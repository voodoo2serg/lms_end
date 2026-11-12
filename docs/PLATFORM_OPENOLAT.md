# LMS End: текущая архитектура (OpenOlat)

**Это current architecture doc.** Исторический черновик с Chamilo: [`PLATFORM_ARCHITECTURE.md`](./PLATFORM_ARCHITECTURE.md) (помечен historical).  
Границы репо: [`LMS_OWNERSHIP.md`](./LMS_OWNERSHIP.md). Контракты: [`LMS_INTEGRATIONS.md`](./LMS_INTEGRATIONS.md).

## Состав и источники

- **Активный runtime:** OpenOlat + Keycloak + thin adapter (`app.lms_app`, `compose.lms.yaml`).
- Vendored Voronka (`app/` CRM/funnel) и `site/` — **frozen archive** (см. LMS_OWNERSHIP); money SoR = отдельный репо **voronka**; сайт/ЛК = **solo_pr**.
- OpenOlat: внешний штатный сервер, код ядра не копируется и не меняется.
- Keycloak: IdP. `issuer+sub` — постоянная идентичность.
- BigBlueButton: **сервер C**, внешний; штатный модуль OpenOlat.
- RAGA: внешний Gateway (опциональный AI).

## Владельцы данных

| Данные | Владелец |
|---|---|
| Контакты, сделки, воронки, заказы, платежи, AccessGrant authority | **voronka** (отдельный репо/БД) |
| Связь commerce product ↔ OpenOlat course/group | `learning_courses` (soft `commerce_product_id`, без FK в CRM) |
| Слушатель SSO/LMS | `learning_users` (`subject` = Keycloak sub; soft `voronka_profile_id`) |
| Коммерческое решение о доступе | voronka → M2M `enrollment.desired|revoke` (`course.view`) |
| Проекция зачисления | `learning_enrollments` + `learning_access_grants` |
| Задания интеграций | `learning_jobs` |
| Академическое completion → commerce | `learning_outbound_events` (`learning.completed`) |
| Учебные работы, оценки, портфолио, BBB-комнаты | OpenOlat FS/DB |
| Пароли, MFA, email verify | Keycloak PostgreSQL |
| Знания / платные модели | RAGA |
| Сайт / ЛК / leads | **solo_pr** (RU cloud) |

## Размещение

| Сервер | Роль |
|--------|------|
| A (RU cloud) | solo_pr site + ЛК BFF |
| B (home) | LMS: OpenOlat + Keycloak + adapter DB/API/worker (`compose.lms.yaml`). ~4 vCPU / 8–12 GB без CRM |
| B optional CRM | Отдельный voronka stack — **не** требуется, чтобы поднять LMS |
| C | BBB |

Нет shared Postgres между solo_pr / voronka / lms_end. Прямых SQL в OpenOlat/Keycloak нет.

## Доступ и оплата

`learning_courses` связывает soft commerce product id с закрытой BusinessGroup OpenOlat.  
`olat_course_id` — RepositoryEntry key (`/url/RepositoryEntry/{key}`); `olat_group_id` — BusinessGroup key.

**Canonical capability:** `course.view` (LMS-4). Legacy CRM alias `course.enter` принимается reconciler’ом.

`ACCESS_AUTHORITY=external` (default): LMS **не** читает Order/Payment и **не** создаёт Robokassa-заказы.  
Worker сверяет доступ каждые 30 с; создаёт пользователя (externalId=Keycloak sub), биндит `KEYCLOAK`, меняет membership. Self-enrol и public paid course — выключены (см. `LMS_ENFORCEMENT.md`).

## Capability list (current)

| Capability | Owner | Enforced in OpenOlat v1? |
|---|---|---|
| `course.view` | LMS enrollment (canonical) | Yes — BusinessGroup membership |
| `course.enter` | Legacy CRM alias → treated as `course.view` | Same |
| `video.play`, `document.*`, `archive.view`, `live.join` | voronka policy only | No (group-only v1) |
| `certificate.issue` / download | voronka (payment + academic) | No — LMS emits `learning.completed` only |

Servers: **A** solo_pr · **B** LMS home (`compose.lms.yaml`) · **C** BBB external.

## ИИ

- Отдельный RAGA alias/токен на курс. В endpoint курса помещаются только материалы данного курса; не общая база всех клиентов.
- Для воронки — отдельный `RAGA_FUNNEL_ALIAS`, для черновиков менеджера — `RAGA_MANAGER_ALIAS`.
- Все новые вызовы выполняются сервером. Ключей платных провайдеров в браузере нет.
- В RAGA требуется реально настроить платного провайдера и модель, лимит контекста/выхода и бюджет. Облачная подписка ChatGPT не является API-ключом.
- `AI_ENABLED=0` по умолчанию. Слушатель отдельно включает помощника и напоминания.
- Локальный бюджет — консервативный резерв в micro-USD на каждый вызов, не банковский биллинг. Значение MAX_REQUEST должно покрывать максимальную стоимость выбранной модели с RAG-контекстом. Окончательный жёсткий денежный лимит устанавливается у провайдера/RAGA.
- Тайм-аут платного запроса не повторяется автоматически: он мог быть тарифицирован. Неизвестные/ошибочные обращения сохраняют резерв.
- ИИ не выставляет оценки, не подтверждает оплату, не меняет доступы и не исполняет инструменты из сообщений.
- Узел `ai` в воронке получает только ответы текущего run, использует резервный текст при сбое, отправляет результат через штатный Outbox. Первичное сообщение — только после Start пользователя; чужие импортированные usernames не превращаются в диалоги.

## Напоминания

Приветственное напоминание создаётся при первом успешном зачислении. Напоминания о занятиях и домашних заданиях владелец планирует через `/learning` или API с точными датой/темой. Их автоматическое извлечение из всех видов заданий OpenOlat не реализовано. Фактические задания и дедлайны остаются в LMS. ИИ добавляет только вступление, обязательная фактическая часть формируется из сохранённых данных.

Веб-уведомления доступны в кабинете. В настройках слушатель получает одноразовую ссылку на бот. После Start привязка подтверждается; нельзя присвоить диалог, уже связанный с чужим аккаунтом или заказом. Для внешней доставки в `Profile.extra.learning_connection_id` сохраняется подтверждённое подключение; API проверяет принадлежность проекту, согласие и opt-out. Не используйте импортированные ID как доказательство принадлежности канала. Отказ проверяется повторно перед отправкой Outbox.

## Надёжность

- Очередь заявок сайта создаётся SQLite-trigger одновременно с INSERT заявки. Повтор API дедуплицируется по receipt id и хешу тела.
- API OpenOlat использует Basic Authentication с выделенным API key, без переходов на произвольные URL.
- LMS-операции идемпотентны; сетевые/429/5xx ошибки повторяются ограниченно. Ошибки конфигурации и доступа видны владельцу.
- Один learning-worker защищён PostgreSQL advisory lock. После прерывания незавершённые LMS-операции возвращаются в очередь; неопределённые AI-вызовы помечаются для разбирательства.
- SSO JWT проверяются по JWKS, issuer, audience, сроку и подтверждению email. CRM-сотрудник дополнительно привязывается через `OIDC_STAFF_MAP`; совпадения email не дают роль сотрудника.
- BFF хранит токены в серверной SQLite в AES-256-GCM, браузеру выдаётся только HttpOnly session cookie. Изменения проверяют Origin. Новые пользователи получают общий вход; старые локальные аккаунты требуют явной привязки личности перед первым SSO-входом.

## Границы подтверждения

Локальные тесты проверяют инварианты и HTTP-контракты с имитацией внешних ответов. Настоящие OpenOlat, Keycloak, BBB, RAGA, SMTP и магазин должны пройти отдельную приёмку на сервере. Наличие LMS само по себе не подтверждает образовательную лицензию. Официальные документы, учебные программы, хранение и портфолио настраиваются под выбранный вид обучения.
