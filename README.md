# Соло-PR · LMS End

Сайт, CRM и воронки Voronka, OpenOlat, общий вход Keycloak и ИИ через существующий RAGA Gateway. Один экземпляр — один проект. EspoCRM и Moodle не используются.

## Реализовано

- `site/`: существующий сайт и новый кабинет `/learning`: мои курсы, переход в OpenOlat, каталог/оформление заказа, ИИ-помощник, настройки, напоминания, панель владельца.
- В корне: исходная Voronka — CRM, сценарии, каналы, медиабанк, финансовый учёт и Робокасса. CRM доступна по `/crm/`, редактор воронок — на API-домене.
- Узел «ИИ-помощник» в редакторе воронок: задача, резервный текст, продолжение сценария. Генерация через отдельный worker; отправка штатным Outbox.
- Адаптер OpenOlat: создание пользователя, привязка Keycloak sub, назначение/отзыв коммерческой группы по реальной оплате, возвратам и сроку AccessGrant.
- Keycloak JWT, PKCE, шифрование token sessions; общий вход в учебный и community-кабинет. Старые аккаунты связываются явно.
- Заявки сайта передаются в CRM через долговечную очередь с подтверждением согласия и дедупликацией.
- Приветственное напоминание после зачисления; планируемые сообщения о курсе/занятии/домашнем задании, opt-out, повторная проверка доступа перед отправкой.
- Изолированные RAGA aliases, лимиты запросов, резерв бюджета, журнал usage; курс, воронка и черновики менеджера.
- Миграция 0007, тесты, CI, конфигурация установки, резервирование.

## Границы готовности

OpenOlat/Keycloak/BBB/RAGA и настоящий магазин нужно подключить на серверах и проверить. Автотесты используют имитацию внешних HTTP-ответов. Реальные ключи, курсы, платные подписки и лицензия в репозитории отсутствуют.

CMS и старый community-кабинет пока используют существующие SQLite/JSON на российском сервере A. Полный перевод сайта на PostgreSQL не выполнен. Старые вручную выданные purchases не подменяют подтверждённые платежи CRM.

Напоминания о заданиях/занятиях планируются владельцем или API. Универсального импорта дедлайнов и всех учебных результатов из OpenOlat пока нет. Полные задания, оценки, портфолио и расписание остаются в LMS.

Робокасса сохраняет проверку ResultURL и тестовый режим. Автоматическое формирование Receipt ещё отсутствует: до реальных продаж требуется рабочая схема фискализации магазина либо доработка Receipt. Один LIVE_READY не заменяет её. Тестовые деньги не дают оплаченный доступ.

## Архитектура

Подробная модель и владельцы данных: [PLATFORM_OPENOLAT.md](docs/PLATFORM_OPENOLAT.md). История исходной Voronka: [VORONKA_BASE.md](docs/VORONKA_BASE.md).

| Контур | Состав |
|---|---|
| A, РФ | Next.js, CMS, серверные сессии, очередь форм |
| B, РФ | Voronka API, delivery-worker, learning-worker, PostgreSQL/Redis, OpenOlat и Keycloak |
| C | Отдельная штатная установка BBB |
| Существующий RAGA | Знания и подключение оплачиваемых моделей |

CRM сохраняет PostgreSQL 16. Независимые новые базы OpenOlat/Keycloak — PostgreSQL 18. Не меняем major-версию на существующем volume автоматически. Для B начальная оценка 8 vCPU / 16–24 ГБ RAM без BBB и локальных моделей; требуется нагрузочная проверка.

## Установка сервера B

Нужны Linux, Docker Engine, Compose v2 и HTTPS-домены api/auth/learn. Сначала выберите поддерживаемые релизы Keycloak и OpenOlat. Dockerfile OpenOlat использует официальный WAR с проверкой SHA256; версия и checksum обязательны.

```bash
git clone https://github.com/voodoo2serg/lms_end.git
cd lms_end
python3 -m scripts.bootstrap_platform --domain solo-pr.ru --keycloak-version VERIFIED_VERSION --openolat-war-url https://OFFICIAL_RELEASE_URL/openolat.war --openolat-war-sha256 VERIFIED_SHA256
docker compose -f compose.yaml -f compose.platform.yaml up -d --build
docker compose -f compose.yaml -f compose.platform.yaml exec api python -m scripts.seed_learning
docker compose -f compose.yaml -f compose.platform.yaml exec api python -m scripts.create_crm_owner
```

VERIFIED_VERSION/URL/SHA256 выше — значения для обязательной подстановки. Генератор создаёт игнорируемые .env и realm.json со случайными секретами и не перезаписывает существующий .env. При переносе работающей Voronka сохраните её DATABASE_URL, секреты, OWNER_TELEGRAM_ID и PLATFORM_PROJECT_ID.

Заполните SMTP, bot/API/payment/RAGA-параметры в .env. Примените хостовый reverse proxy по deploy/platform/Caddyfile. Базовый Compose edge-профиль одновременно не включать. Базы и Redis наружу не публикуются.

### Общий вход

1. В Keycloak настройте SMTP, тексты условий и обработки данных, владельца, client role owner в solo-api и MFA владельца. Шаблон включает обязательное принятие условий; их содержание задаётся при установке.
2. В OIDC_STAFF_MAP укажите проверенный Keycloak sub и существующий CRM admin id, например {"VERIFIED_SUB":-1}. Совпадение email не даёт служебных ролей.
3. Завершите первичную настройку OpenOlat, проверьте Keycloak-провайдер, создайте выделенного API-пользователя/API key. Запишите OPENOLAT_API_USER/KEY и пересоздайте API/worker.
4. Создайте продукт в CRM. В /learning свяжите его с RepositoryEntry key курса и BusinessGroup key. Свяжите группу с курсом в OpenOlat, отключите публичную/самостоятельную запись в платный курс.

Realm импортируется первоначально. Изменения существующего realm вносятся через Keycloak: повторный import-файл его молча не перезапишет.

Для старого community-аккаунта после проверки личности:

```bash
cd site
DATA_DIR=/PATH/TO/EXISTING/DATA node scripts/link-oidc.mjs VERIFIED_EMAIL VERIFIED_KEYCLOAK_SUB
```

Пароли не копируются. Перезапись чужой/существующей привязки запрещена.

## Сайт A

Используйте site/Dockerfile или Node 24: npm ci --legacy-peer-deps, npm run build:vps. Не включайте Workers-режим для российского production-сервера.

На A нужны только SITE_ORIGIN, OIDC_ISSUER, OIDC_CLIENT_ID/SECRET, LEARNING_API_URL, LEARNING_SESSION_KEY, SITE_BRIDGE_TOKEN, DATA_DIR и обычные настройки сайта. Не копируйте на A все пароли БД, ботов и RAGA из .env сервера B.

deploy/platform/site-nginx.conf — пример маршрутов: learning/portal API идут в Next.js, CRM/остальные API Voronka — на B. Подставьте свой API-домен и корректный TLS SNI. При VPN привяжите API к нужному закрытому адресу: базовая установка слушает только loopback. Очередь форм отправляется Next.js instrumentation каждые 30 секунд и переживает перезапуск.

## РАГА и платные ресурсы

Контракт: POST /api/gateway/v1/chat/completions, Bearer, model=alias, messages, max_tokens, stream=false. Проверен по существующему RAGA Gateway; приватный код и ключи RAGA не публикуются.

Создайте отдельные endpoint/token:

| Назначение | Настройка B |
|---|---|
| Открытый помощник воронки | RAGA_FUNNEL_ALIAS/TOKEN |
| Черновик менеджера | RAGA_MANAGER_ALIAS/TOKEN |
| Материалы конкретного курса | Alias курса + переменная, например RAGA_PR_TOKEN |

У endpoint курса — отдельный проект знаний, memory_write_mode=off, learning_disabled=true, выбранная оплачиваемая модель, ограничения контекста/выхода. Чужие работы и данные клиентов в общую базу курса не загружать. Ключи провайдера хранятся только в RAGA. Подписка ChatGPT не является API-балансом.

В .env задайте RAGA_URL без /api, aliases/tokens и AI_ENABLED=1. Курс хранит имя переменной токена, не секрет. Пользователь не задаёт модель или URL. Неопределённый платный вызов не повторяется автоматически.

Локальный бюджет — резерв micro-USD, не банковский биллинг. MAX_REQUEST должен покрывать самый дорогой допустимый запрос с RAG-контекстом. Финальный жёсткий лимит расходов нужен у провайдера/RAGA.

## BBB и напоминания

BBB подключается штатным модулем OpenOlat на отдельном сервере. Проверьте авторизацию комнат и доступ к записям. В /learning владелец планирует напоминания с точной темой/датой. Слушатель отдельно включает напоминания и ИИ. Для внешнего канала задайте Profile.extra.learning_connection_id: нужен подтверждённый диалог бота или разрешённый email, одного username недостаточно.

## Проверки и резервирование

```bash
python -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
DATABASE_URL=sqlite:// REDIS_URL=redis://localhost:6379/0 .venv/bin/python -m pytest -q
docker compose -f compose.yaml -f compose.platform.yaml exec api python -m scripts.check_integrations
sh scripts/backup_platform.sh
```

Если /tmp маленький, задайте TMPDIR на диске со свободными 5+ ГБ: медиабанк намеренно запрещает загрузки при нехватке места. Скрипт резервирует B с остановкой пишущих сервисов: базы CRM/OpenOlat/Keycloak, файлы и секреты. Копии шифровать и выносить с сервера; проверять восстановлением. На A отдельно сохраняются site data/конфигурация. PITR/RPO 15 минут требуют отдельного архивирования WAL и не обеспечиваются одним snapshot-скриптом.

Перед запуском пройти реальную цепочку: заявка → CRM → заказ → оплата → зачисление → SSO → работа/оценка в LMS → BBB → напоминание → возврат → отзыв доступа. Отдельно проверить чужие документы, прямые ссылки, повтор callback, выключенную LMS и восстановление.
