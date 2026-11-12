# LMS backup & PD residency (LMS-8)

## What to back up

| Asset | Location |
|-------|----------|
| Adapter DB | `lms_adapter` (compose.lms) or learning_* on funnel (legacy) |
| OpenOlat DB | `openolat` on learning-db |
| OpenOlat files | volume `openolat_data` |
| Keycloak DB | `keycloak` on learning-db |
| Secrets | `.env` (mode 600) |

Scripts: `scripts/backup_platform.sh` (legacy full stack), `scripts/backup_lms.sh` (LMS-only).

## Encrypt + off-home copy

1. Stop writers (`api`, `learning-worker`, `openolat`, `keycloak`) or use consistent PG dump + file tarball.
2. Produce dumps under `backups/lms-<UTC>/` with mode 700.
3. Encrypt: `age -r <recipient> -o backup.tar.gz.age backup.tar.gz` (or `gpg -c`).
4. Copy ciphertext off the home server (second disk / RU object storage / offline media).
5. **Restore drill** (quarterly): new empty volumes → decrypt → `pg_restore` openolat/keycloak/adapter → untar files → start compose → Keycloak login + OpenOlat course open smoke test.

## PITR (optional)

If RPO &lt; snapshot interval: enable PostgreSQL WAL archiving on `learning-db` for `openolat` + `lms_adapter` (+ `keycloak` if IdP recovery is in scope). Document archive destination and basebackup cadence in the host runbook.

## PD processors leaving home

| Processor | Leaves home? | Gate |
|-----------|--------------|------|
| RAGA | Yes (HTTP to gateway) | `AI_ENABLED`, per-course token, learner `ai_enabled` consent |
| SMTP (Keycloak mail) | Yes | Keycloak realm SMTP config |
| BBB (server C) | Yes (AV media) | OpenOlat BBB module; separate host |
| voronka completion webhook | Home→home or LAN | `VORONKA_COMPLETION_URL` |

Do not enable AI or external SMTP without contractual residency review.
