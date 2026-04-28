# Al-Hiraa ATMS

**Applicant Tracking & Management System** — a full-stack recruitment platform built with NestJS, React, PostgreSQL, and Redis.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start (Automated)](#quick-start-automated)
- [Manual Setup](#manual-setup)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Available Scripts](#available-scripts)
- [User Roles](#user-roles)
- [Default Credentials](#default-credentials)
- [API Overview](#api-overview)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4 |
| State | Redux Toolkit, React Hook Form |
| Backend | NestJS 11, TypeScript |
| ORM | Prisma 7 |
| Database | PostgreSQL 17 |
| Cache | Redis 7 |
| Auth | JWT (access + refresh tokens), Passport |
| Containerization | Docker / Docker Compose |

---

## Project Structure

```
Al-Hiraa/
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── components/   # Shared UI components
│   │   ├── pages/        # Page components by feature
│   │   ├── store/        # Redux store + RTK Query API slices
│   │   └── utils/        # Helpers (PDF generation, etc.)
│   └── vite.config.ts
├── server/               # NestJS backend
│   ├── prisma/
│   │   ├── schema.prisma # Database schema
│   │   ├── migrations/   # Migration history
│   │   └── seed*.ts      # Seed scripts
│   └── src/
│       ├── auth/         # JWT auth module
│       ├── candidates/   # Candidate management
│       ├── jobs/         # Job postings
│       ├── pipeline/     # Recruitment pipeline
│       ├── interview-events/
│       ├── process-tracking/
│       ├── finance/      # Payment tracking
│       ├── analytics/    # Reporting & dashboards
│       └── ...           # Other feature modules
├── shared/               # Shared TypeScript types
├── docker-compose.yml    # PostgreSQL + Redis services
├── .env.example          # Environment variable template
└── start.sh              # One-command dev setup script
```

---

## Prerequisites

- **Node.js** 20+ (use [nvm](https://github.com/nvm-sh/nvm) recommended)
- **npm** 10+
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)
- **Git**

---

## Quick Start (Automated)

The `start.sh` script handles everything — Docker services, migrations, seeding, and dev servers.

```bash
git clone https://github.com/excellis-it/al_hiraa_next.git
cd al_hiraa_next
cp .env.example .env
chmod +x start.sh
./start.sh
```

Once complete:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api

---

## Manual Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/excellis-it/al_hiraa_next.git
cd al_hiraa_next
npm install
```

This installs dependencies for the root, `client`, `server`, and `shared` packages via npm workspaces.

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` as needed (see [Environment Variables](#environment-variables) below).

### 3. Start Docker services

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 17** on port `5432`
- **Redis 7** on port `6379`

Verify containers are running:

```bash
docker compose ps
```

### 4. Run database migrations

```bash
npm run db:migrate
```

### 5. Seed the database

```bash
npm run db:seed
```

### 6. Start the development servers

```bash
npm run dev
```

This runs the NestJS API and Vite dev server concurrently.

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api

---

## Environment Variables

Copy `.env.example` to `.env` and update values before running:

```env
# Database (matches docker-compose.yml defaults)
DATABASE_URL=postgresql://alhiraa:alhiraa_dev_2026@localhost:5432/alhiraa_atms

# Redis
REDIS_URL=redis://localhost:6379

# JWT — change these secrets in production
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server
PORT=3001
NODE_ENV=development

# Client (Vite)
VITE_API_URL=http://localhost:3001/api
```

> **Production note:** Always set strong, unique values for `JWT_SECRET` and `JWT_REFRESH_SECRET`. Never commit a `.env` file with real secrets.

---

## Database

### Migrations

```bash
# Apply pending migrations
npm run db:migrate

# Create a new migration after editing schema.prisma
cd server && npx prisma migrate dev --name <migration-name>
```

### Seeding

```bash
# Default seed (roles, admin user, masters data)
npm run db:seed

# Fresh seed — drops all data and re-seeds everything
cd server && npx ts-node prisma/seed-fresh.ts
```

### Prisma Studio (GUI)

```bash
npm run db:studio
```

Opens a browser-based database explorer at http://localhost:5555.

### Reset (migrate + fresh seed)

```bash
npm run db:reset
```

---

## Available Scripts

Run from the project root:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API + frontend in watch mode |
| `npm run dev:server` | Start NestJS server only |
| `npm run dev:client` | Start Vite dev server only |
| `npm run build` | Production build for both client and server |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset and re-seed the database |

---

## User Roles

| Role | Access |
|------|--------|
| `admin` | Full system access — users, config, audit logs |
| `manager` | All operational modules, reports, finance |
| `recruiter` | Jobs, pipeline, interview events |
| `process_manager` | Process tracking, deployments |
| `data_entry` | Candidate registration and data entry |

---

## Default Credentials

After seeding, the following accounts are available in development:

| Email | Password | Role |
|-------|----------|------|
| admin@alhiraa.com | Admin@123 | admin |

Additional test users are created by the seed scripts with role-appropriate access.

---

## API Overview

The API is available at `http://localhost:3001/api`. All endpoints (except `/api/auth/login`) require a Bearer token.

**Authentication**
```
POST /api/auth/login          # Get access + refresh tokens
POST /api/auth/refresh        # Refresh access token
POST /api/auth/register       # Create new user (admin only)
```

**Core Resources**
```
/api/candidates               # Candidate CRUD + import
/api/jobs                     # Job postings
/api/companies                # Company management
/api/pipeline                 # Recruitment pipeline
/api/interview-events         # Interview scheduling
/api/process-tracking         # Process steps per candidate
/api/process-details          # Process detail records
/api/deployments              # Deployed candidates
/api/finance                  # Payment tracking
/api/payments                 # Individual payments
/api/associates               # Associate management
/api/referrers                # Referrer tracking
/api/analytics                # Dashboard analytics
/api/masters                  # Master data (trades, sources, etc.)
/api/users                    # User management
/api/audit                    # Audit log
/api/notifications            # Notifications
/api/message-templates        # Message templates
```

---

## Production Build

```bash
# Build client and server
npm run build

# Start the production server (from server/dist)
cd server && node dist/main.js
```

The built frontend assets should be served by your web server (nginx, etc.) or configured as static files in the NestJS app.
