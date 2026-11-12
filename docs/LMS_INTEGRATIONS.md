# LMS integration contracts (LMS-2, LMS-6, LMS-10)

Aligns with solo_pr Block 1 surfaces (`lead.created`, `deal.paid` / `access.*`, LMS handoff redeem) without sharing databases.

## Inbound: voronka → LMS enrollment (LMS-2)

`POST /api/integrations/voronka/enrollment`

Auth (one of):

- `Authorization: Bearer $VORONKA_LMS_TOKEN`
- `X-Voronka-Signature: sha256=<hmac_sha256(body, VORONKA_LMS_HMAC_SECRET)>`

Body (`schema_version: 1`):

```json
{
  "schema_version": 1,
  "event_id": "evt_unique_id",
  "action": "desired",
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

Rules:

- Idempotent by `event_id`
- Stale `revision` is recorded and ignored
- `action=revoke` or expired `expires_at` clears desired enrollment
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

`POST $VORONKA_COMPLETION_URL` with `X-Lms-Signature: sha256=…`

Queued via `POST /api/learning/admin/completion` (owner). Payload kind `learning.completed`.  
Certificate issuance policy (full payment + academic) stays **commerce-side** in voronka; LMS only attests academic facts.

## Handoff

solo_pr redeem `POST /api/integrations/lms/handoff` (Block 1) is site-owned. LMS launch remains `POST /api/learning/courses/{id}/launch` after enrollment `state=active`.
