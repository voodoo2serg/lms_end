"""Create LMS adapter tables without CRM funnel schema (LMS-3 / LMS-5)."""
from __future__ import annotations

import os
import sys

# Ensure learning models register on Base.metadata before create_all.
from app.db import Base, engine, Event  # noqa: F401
from app import learning_models  # noqa: F401

LMS_TABLES = {
    "events",  # audit sink used by learning_service.audit
    "learning_users",
    "learning_courses",
    "learning_enrollments",
    "learning_jobs",
    "learning_notices",
    "learning_reminders",
    "learning_ai_usage",
    "learning_messages",
    "learning_bot_links",
    "learning_access_grants",
    "learning_outbound_events",
}


def main():
    if (os.getenv("ACCESS_AUTHORITY") or "external").lower() != "external":
        print("init_lms_adapter_db expects ACCESS_AUTHORITY=external", file=sys.stderr)
        return 2
    tables = [t for t in Base.metadata.sorted_tables if t.name in LMS_TABLES]
    missing = LMS_TABLES - {t.name for t in tables}
    if missing:
        print("missing metadata for", sorted(missing), file=sys.stderr)
        return 1
    Base.metadata.create_all(engine, tables=tables)
    print("lms adapter schema ready:", ", ".join(t.name for t in tables))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
