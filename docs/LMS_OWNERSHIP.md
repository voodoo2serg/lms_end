# LMS ownership boundaries (LMS-1)

**Current role of this repository:** home-server LMS — OpenOlat + Keycloak + thin access adapter.  
**Not this repository’s job:** money ledger, Robokassa, CRM deals, marketing site / ЛК BFF.

| Repo | Owns |
|------|------|
| **lms_end** | Courses, OpenOlat group membership, Keycloak learner identity, enrollment projection, academic completion attestations |
| **voronka** | Orders, Payments, AccessGrant **authority**, Robokassa, bots/CRM |
| **solo_pr** | Public site, ЛК BFF, lead.created → voronka, purchase/status aggregation |

Repositories are **not** merged. Databases are **not** shared across repos.

## Vendored trees (freeze plan)

| Path | Status | Plan |
|------|--------|------|
| `app/learning_*.py`, `app/lms_app.py`, `app/learning_grants.py` | **Active LMS runtime** | Keep and extend |
| `deploy/openolat/`, `deploy/lms/`, `compose.lms.yaml` | **Active LMS ops** | Keep · adapter port **18083** on shared VPS (see `LMS_VPS_DEPLOY.md`) |
| `app/` CRM/funnel modules (`crm_*`, `worker.py`, `channels.py`, …) | **Frozen archive** | Do not extend for LMS; voronka is SoR. Present only for transitional `ACCESS_AUTHORITY=legacy_crm` and historical CI |
| `web/` (CRM UI) | **Frozen archive** | Money/grants UI belongs in voronka; capability label fixed to `course.view` only for LMS-4 |
| `site/` (solo_pr snapshot) | **Frozen archive** | Live site lives in solo_pr; consume LMS via env (`LEARNING_API_URL`, Keycloak) |
| `compose.yaml` + `compose.platform.yaml` | **Legacy full platform** | Prefer `compose.lms.yaml` for home LMS |

Maximum safe extraction shipped in Block 2: thin `app.lms_app` + grant sync + schema without CRM FKs + LMS-only compose. Full deletion of vendored CRM/site trees is deferred until voronka/solo_pr cutovers are live; until then those paths are **frozen** (no new LMS features there).

## Runtime modes

| `ACCESS_AUTHORITY` | Behavior |
|--------------------|----------|
| `external` (default) | Inbound M2M grants from voronka; `/api/learning/checkout` returns **410**; no CRM money table reads |
| `legacy_crm` | In-process Order/Payment/AccessGrant (transitional monorepo only) |

## Contracts

- Inbound: `POST /api/integrations/voronka/enrollment` (see `docs/LMS_INTEGRATIONS.md`)
- Outbound: `learning.completed` → `VORONKA_COMPLETION_URL`
- solo_pr handoff redeem remains site-side (Block 1); LMS exposes launch/status APIs only
