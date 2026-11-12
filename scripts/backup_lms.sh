#!/bin/sh
# LMS-only backup (compose.lms.yaml). Encrypt and copy off-home after this script.
set -eu
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="backups/lms-$stamp"
mkdir -p "$target"
chmod 700 "$target"
dc() { docker compose -f compose.lms.yaml "$@"; }
dc stop api learning-worker openolat keycloak
trap 'dc start api learning-worker openolat keycloak >/dev/null' EXIT INT TERM
dc exec -T learning-db pg_dump -U lms -d lms_adapter -Fc > "$target/lms_adapter.dump" || \
  dc exec -T learning-db pg_dump -U postgres -d lms_adapter -Fc > "$target/lms_adapter.dump"
dc exec -T learning-db pg_dump -U postgres -d openolat -Fc > "$target/openolat.dump"
dc exec -T learning-db pg_dump -U postgres -d keycloak -Fc > "$target/keycloak.dump"
dc run --rm --no-deps --entrypoint tar openolat -C /data/openolat -czf - . > "$target/openolat-files.tar.gz"
cp .env "$target/runtime.env"
chmod 600 "$target"/*
echo "LMS snapshot at $target — encrypt (age/gpg) and copy off the home server. Run a restore drill before trusting RPO."
