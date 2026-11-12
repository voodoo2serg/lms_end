# Learning schema decoupling (LMS-3)

## Target

Adapter DB (or schema) holds only soft external ids:

| Column | Meaning |
|--------|---------|
| `learning_users.subject` | Keycloak `sub` |
| `learning_users.voronka_profile_id` / `profile_id` | Soft CRM profile id — **no FK** |
| `learning_courses.commerce_product_id` / `product_id` | Soft voronka product id — **no FK** |
| `learning_courses.project_id` | Soft tenant id — **no FK** |

No ForeignKey into `crm_profiles`, `crm_products`, `projects`, or money tables.

## Path from migration 0007

1. Apply **0008** on existing funnel Postgres (transitional installs): drops CRM FKs, adds external id columns, creates `learning_access_grants` + `learning_outbound_events`, backfills `commerce_product_id` / `voronka_profile_id`.
2. Prefer **fresh LMS-only DB** via `compose.lms.yaml` → `scripts/init_lms_adapter_db.py` (create_all of learning tables only on `lms_adapter` database). No CRM tables required.
3. Cutover: set `ACCESS_AUTHORITY=external`, point voronka at `/api/integrations/voronka/enrollment`, disable LMS checkout clients.

## Compose

`compose.lms.yaml` starts `learning-db`, Keycloak, OpenOlat, thin API/worker, small Redis — **without** Voronka `db` / funnel worker.
