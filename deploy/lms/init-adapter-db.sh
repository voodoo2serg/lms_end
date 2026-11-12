#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lms') THEN
    CREATE USER lms WITH PASSWORD '${LMS_ADAPTER_DB_PASSWORD}';
  ELSE
    ALTER USER lms WITH PASSWORD '${LMS_ADAPTER_DB_PASSWORD}';
  END IF;
END\$\$;
SELECT 'CREATE DATABASE lms_adapter OWNER lms'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'lms_adapter')\gexec
SQL
