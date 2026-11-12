# OpenOlat enforcement threat model (LMS-7)

## Decision (v1)

**Group-only membership is sufficient for v1.** Fine-grained CRM capabilities (`video.play`, …) are **not** enforced inside OpenOlat. A Policy Bridge is out of scope until group-only proves inadequate.

Canonical commercial capability for enrollment: **`course.view`**.

## Latency / revoke

| Path | Bound |
|------|-------|
| Grant sync apply | Immediate enrollment `desired` flip + job enqueue |
| Learning worker | Processes enrollment jobs continuously |
| Periodic sweep | `reconcile()` every **30s** re-checks expiry / revoke |
| OpenOlat membership | PUT/DELETE BusinessGroup participant |

## Open LMS session after revoke

Revoke removes BusinessGroup membership. An already-open SSO browser session may retain cached UI until OpenOlat re-checks authorization on the next protected resource request. **Acceptance:** paid course must not be public; self-enrol off; after revoke, new deep-links and group-gated resources fail within one refresh / navigation. Exact session kill via Keycloak logout is optional ops hardening, not required for v1.

## Teacher enroll bypass

Operators must disable manual teacher enrol onto paid commercial groups except documented break-glass. Checklist:

- [ ] Self-enrolment disabled on paid courses
- [ ] Course / group not in public catalog
- [ ] Commercial group is the only membership source for paid access
- [ ] Spot-check: unpaid Keycloak user cannot open RepositoryEntry
- [ ] Spot-check: after revoke event, group membership removed within 30s + job runtime
