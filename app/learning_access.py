"""Access authority for LMS enrollment.

external (default for LMS-only / home compose):
  voronka pushes enrollment.desired|revoke via M2M; LMS never reads CRM money tables
  and never creates Robokassa orders.

legacy_crm (transitional monorepo only):
  in-process Order/Payment/AccessGrant reads — frozen path, do not extend.
"""
from __future__ import annotations

import os
from datetime import timezone

# Canonical LMS enrollment capability (LMS-4). CRM historically allowed course.enter.
CANONICAL_CAPABILITY = "course.view"
CAPABILITY_ALIASES = frozenset({CANONICAL_CAPABILITY, "course.enter"})


def access_authority() -> str:
    value = (os.getenv("ACCESS_AUTHORITY") or "external").strip().lower()
    if value not in {"external", "legacy_crm"}:
        return "external"
    return value


def is_external() -> bool:
    return access_authority() == "external"


def normalize_capability(capability: str | None) -> str:
    raw = (capability or CANONICAL_CAPABILITY).strip()
    if raw in CAPABILITY_ALIASES:
        return CANONICAL_CAPABILITY
    return raw


def utc(value):
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
