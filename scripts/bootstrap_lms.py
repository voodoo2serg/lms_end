"""LMS-only bootstrap: .env + Keycloak realm.json without Voronka CRM stack.

Does not overwrite an existing .env. Generates deploy/generated/realm.json required
by compose.lms.yaml before Keycloak can start (LMS-5 / Codex P1).
"""
from __future__ import annotations

import argparse
import os
import secrets
from pathlib import Path
from uuid import uuid4

from scripts.configure_platform import main as render_realm


def main():
    parser = argparse.ArgumentParser(description="Bootstrap LMS-only home deploy config")
    parser.add_argument("--domain", required=True, help="Apex domain, e.g. solo-pr.ru")
    parser.add_argument("--keycloak-version", required=True)
    parser.add_argument("--openolat-war-url", required=True)
    parser.add_argument("--openolat-war-sha256", required=True)
    parser.add_argument("--project-id", default=None, help="Soft tenant id (PLATFORM_PROJECT_ID)")
    parser.add_argument("--site-origin", default=None, help="solo_pr origin; default https://DOMAIN")
    args = parser.parse_args()
    if not args.openolat_war_url.startswith("https://") or len(args.openolat_war_sha256) != 64:
        raise SystemExit("Use an official HTTPS WAR URL and a verified 64-char SHA256")

    env_path = Path(".env")
    created_env = False
    if env_path.exists():
        # Load existing env for realm render; never overwrite.
        for line in env_path.read_text().splitlines():
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key, value)
    else:
        values = {
            line.split("=", 1)[0]: line.split("=", 1)[1]
            for line in Path(".env.example").read_text().splitlines()
            if line and not line.startswith("#") and "=" in line
        }
        for name in (
            "LEARNING_DB_ROOT_PASSWORD", "OPENOLAT_DB_PASSWORD", "KEYCLOAK_DB_PASSWORD",
            "LMS_ADAPTER_DB_PASSWORD", "KEYCLOAK_ADMIN_PASSWORD", "OPENOLAT_OIDC_SECRET",
            "OIDC_CLIENT_SECRET", "VORONKA_LMS_TOKEN", "VORONKA_LMS_HMAC_SECRET",
        ):
            values[name] = secrets.token_urlsafe(36)
        site = args.site_origin or ("https://" + args.domain)
        values.update(
            ACCESS_AUTHORITY="external",
            SITE_ORIGIN=site,
            DOMAIN="api." + args.domain,
            API_DOMAIN="api." + args.domain,
            AUTH_DOMAIN="auth." + args.domain,
            LEARN_DOMAIN="learn." + args.domain,
            OPENOLAT_URL="https://learn." + args.domain,
            OIDC_ISSUER="https://auth." + args.domain + "/realms/solo-pr",
            LEARNING_API_URL="https://api." + args.domain,
            PLATFORM_PROJECT_ID=args.project_id or str(uuid4()),
            KEYCLOAK_VERSION=args.keycloak_version,
            OPENOLAT_WAR_URL=args.openolat_war_url,
            OPENOLAT_WAR_SHA256=args.openolat_war_sha256,
            DATABASE_URL="postgresql+psycopg://lms:" + values["LMS_ADAPTER_DB_PASSWORD"]
            + "@learning-db:5432/lms_adapter",
            REDIS_URL="redis://redis:6379/0",
            # Stub so accidental legacy imports do not crash; LMS-only does not use Telegram owner.
            OWNER_TELEGRAM_ID="-1",
            POSTGRES_PASSWORD=secrets.token_urlsafe(24),
        )
        env_path.write_text("\n".join(k + "=" + v for k, v in values.items()) + "\n")
        env_path.chmod(0o600)
        os.environ.update(values)
        created_env = True

    required = ("SITE_ORIGIN", "OPENOLAT_URL", "OIDC_CLIENT_SECRET", "OPENOLAT_OIDC_SECRET")
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        raise SystemExit("Missing env for realm render: " + ", ".join(missing))
    render_realm()
    realm = Path("deploy/generated/realm.json")
    if not realm.is_file():
        raise SystemExit("realm.json was not written")
    print(
        "LMS config ready:",
        "created .env;" if created_env else "kept existing .env;",
        "wrote", str(realm),
        "— then: docker compose -f compose.lms.yaml up -d --build",
    )


if __name__ == "__main__":
    main()
