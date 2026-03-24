#!/bin/sh
set -e

if [ "$SKIP_MIGRATIONS" != "true" ]; then
  echo "Running database migrations..."
  npx drizzle-kit push --force
fi

echo "Starting application..."
exec "$@"
