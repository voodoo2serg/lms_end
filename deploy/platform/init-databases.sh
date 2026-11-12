#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  --set=olat_pass="$OPENOLAT_DB_PASSWORD" --set=kc_pass="$KEYCLOAK_DB_PASSWORD" <<'SQL'
CREATE USER openolat WITH PASSWORD :'olat_pass';
CREATE DATABASE openolat OWNER openolat;
CREATE USER keycloak WITH PASSWORD :'kc_pass';
CREATE DATABASE keycloak OWNER keycloak;
SQL
