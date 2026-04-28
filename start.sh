#!/bin/bash
# Al-Hiraa ATMS — Start Script
# Run this once Docker Desktop is running

set -e

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

echo "=== Al-Hiraa ATMS Startup ==="

# 1. Start database
echo ""
echo ">>> Starting PostgreSQL + Redis..."
docker compose up -d

# 2. Wait for Postgres to be ready
echo ">>> Waiting for PostgreSQL to be ready..."
sleep 5

# 3. Run migrations
echo ""
echo ">>> Running database migrations..."
cd server
npx prisma migrate dev --name init
echo ">>> Migrations done."

# 4. Seed data (only if needed)
echo ""
echo ">>> Seeding database..."
npx ts-node prisma/seed.ts
echo ">>> Seed done."
cd ..

# 5. Launch server + client
echo ""
echo ">>> Starting server (port 3001) and client (port 5173)..."
npm run dev

echo ""
echo "=== App running ==="
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001/api"
echo "  Admin login: admin@alhiraa.com / Admin@123"
