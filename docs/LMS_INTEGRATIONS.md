# LMS integration contracts (LMS-2, LMS-6, LMS-10)

Aligns with solo_pr Block 1 surfaces (`lead.created`, `deal.paid` / `access.*`, LMS handoff redeem) without sharing databases.

Wire contract v1: dual-read inbound + dual-emit outbound. Prefer new fields; still accept older voronka shapes.

## Inbound: voronka → LMS enrollment (LMS-2)

`POST /api/integrations/voronka/enrollment`

Auth (any one succeeds):

- `Authorization: Bearer $VORONKA_LMS_TOKEN` (or shared HMAC secret as Bearer)
- HMAC `X-Voronka-Signature` / `X-Lms-Signature`:
  - body-only: `sha256=<hmac_sha256(body, secret)>` (legacy)
  - timestamp: `X-Voronka-Timestamp` / `X-Lms-Timestamp` + `sha256=<hmac_sha256("{ts}."+body, secret)>`, skew ≤ 300s

Body (`schema_version: 1` — int or string `"1"`):

```json
{
  "schema_version": 1,
  "event_id": "evt_unique_id",
  "action": "grant",
  "keycloak_sub": "kc-sub",
  "voronka_profile_id": "profile-uuid",
  "email": "learner@example.ru",
  "name": "Анна",
  "course_id": "pr",
  "commerce_product_id": "product-uuid",
  "capability": "course.view",
  "min_paid_percent": 100,
  "expires_at": null,
  "revision": 3
}
```

Dual-read aliases:

| Canonical | Also accepted |
|-----------|---------------|
| `action` `grant`\|`desired`\|`revoke` | `revoke: true`, `kind`/`type` `enrollment.desired`\|`enrollment.revoked` |
| `course_id` | `resource` (maps to course_id) |
| `event_id` | `idempotency_key` |
| `keycloak_sub` | synthesized from `email` / `voronka_profile_id` when sub absent |
| extra envelope fields (`type`, `kind`, `source`, …) | ignored after normalize |

Rules:

- Idempotent by `event_id`
- Stale `revision` is recorded and ignored
- `action=revoke` / `grant`→desired false/true; expired `expires_at` clears desired enrollment
- Canonical capability: **`course.view`** (`course.enter` accepted as alias on evaluate)
- LMS **does not** create Robokassa orders

## solo_pr as external client (LMS-6)

solo_pr (separate repo) should use only:

| Env | Purpose |
|-----|---------|
| `LEARNING_API_URL` | LMS adapter base URL |
| `OIDC_ISSUER` / client secrets | Keycloak (shared IdP) |
| Voronka commerce URL | Checkout / pay URL — **not** LMS |

Lead bridge remains **site → voronka**, never site → LMS money.  
Course binding UI: LMS owner admin (`PUT /api/learning/admin/courses`) or the same API from solo_pr admin with owner role. Vendored `site/` in this repo is frozen archive.

## Outbound: LMS → voronka completion (LMS-10)

`POST $VORONKA_COMPLETION_URL`

Headers (dual-emit):

- `X-Lms-Timestamp` + `X-Lms-Signature: sha256=…` (HMAC over `{ts}.{body}`)
- `X-Voronka-Timestamp` + `X-Voronka-Signature` (same digest)
- `Authorization: Bearer` shared secret
- `X-Lms-Event-Id` / `X-Voronka-Event-Id`

Payload includes `type`+`kind`=`learning.completed`, `event_id`+`idempotency_key`, `course_id` / `commerce_product_id` / `resource`, `email` / `voronka_profile_id` / `keycloak_sub`, `source=lms_end`.

Queued via `POST /api/learning/admin/completion` (owner).  
Certificate issuance policy (full payment + academic) stays **commerce-side** in voronka; LMS only attests academic facts.

## Handoff

solo_pr redeem `POST /api/integrations/lms/handoff` (Block 1) is site-owned. LMS launch remains `POST /api/learning/courses/{id}/launch` after enrollment `state=active`.
