#!/usr/bin/env bash
# Codespaces post-create setup for EliteBids: installs Postgres, creates the
# database, writes a local .env, installs npm deps, pushes the schema, and
# seeds demo data. Idempotent — safe to re-run.

set -euo pipefail

echo "▶ Installing PostgreSQL..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-client >/dev/null

echo "▶ Starting PostgreSQL..."
sudo service postgresql start

# Create user/db if missing.
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='elite'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER elite WITH PASSWORD 'elite' SUPERUSER;"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='elitebids'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE elitebids OWNER elite;"

# Generate a stable .env if one doesn't already exist.
if [ ! -f .env ]; then
  echo "▶ Writing .env..."
  RANDOM_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
  cat > .env <<EOF
POSTGRES_PRISMA_URL="postgresql://elite:elite@localhost:5432/elitebids"
POSTGRES_URL_NON_POOLING="postgresql://elite:elite@localhost:5432/elitebids"
NEXTAUTH_SECRET="${RANDOM_SECRET}"
NEXTAUTH_URL="http://localhost:3000"
EOF
fi

echo "▶ Installing npm dependencies..."
npm install --no-audit --no-fund --loglevel=error

echo "▶ Pushing Prisma schema..."
npx prisma db push --skip-generate --accept-data-loss

echo "▶ Seeding database..."
npx tsx prisma/seed.ts

echo
echo "✅ Setup complete. The dev server will start automatically on attach."
echo "   When the port-3000 toast appears, tap it to open the app."
echo "   Demo accounts: demo@elitebids.test / password123"
echo "                  buyer@elitebids.test / password123"
