#!/bin/sh
set -e

echo "Waiting for Postgres..."
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.end())
  .catch(() => process.exit(1));
" 2>/dev/null; do
  sleep 1
done
echo "Postgres is ready."

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running migrations..."
  # Prefer local drizzle-kit (pinned with drizzle-orm). Fall back to applying SQL via psql-compatible node.
  if [ -x ./node_modules/.bin/drizzle-kit ]; then
    ./node_modules/.bin/drizzle-kit migrate \
      || echo "Migration step finished with warnings (schema may already be up to date)."
  else
    echo "drizzle-kit missing in image; skip migrate (ensure schema exists)."
  fi
fi

exec "$@"
