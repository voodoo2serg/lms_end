#!/bin/sh
set -eu
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="backups/platform-$stamp"
mkdir -p "$target"
chmod 700 "$target"
dc() { docker compose -f compose.yaml -f compose.platform.yaml "$@"; }
dc stop api worker learning-worker openolat keycloak
trap 'dc start api worker learning-worker openolat keycloak >/dev/null' EXIT INT TERM
dc exec -T db pg_dump -U funnel -d funnel -Fc > "$target/platform.dump"
dc exec -T learning-db pg_dump -U postgres -d openolat -Fc > "$target/openolat.dump"
dc exec -T learning-db pg_dump -U postgres -d keycloak -Fc > "$target/keycloak.dump"
dc run --rm --no-deps --entrypoint tar api -C /data/media -czf - . > "$target/media.tar.gz"
dc run --rm --no-deps --entrypoint tar openolat -C /data/openolat -czf - . > "$target/openolat-files.tar.gz"
cp .env "$target/runtime.env"
chmod 600 "$target"/*
echo "Server B snapshot complete. Encrypt and copy off-server. Server A site data requires a separate stopped-site snapshot."
