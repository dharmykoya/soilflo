# SoilFLO API

A RESTful dispatch-ticket API for construction-site material tracking, built with **NestJS**, **TypeScript**, **PostgreSQL**, and **TypeORM**. Optionally supports async bulk-create via **BullMQ + Redis**.

> **Submission notes:** See [solution.md](solution.md) for answers to the take-home discussion questions, assumptions made, and LLM usage disclosure.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Queue Mode (BullMQ)](#queue-mode-bullmq)
- [Testing](#testing)
- [Project Structure](#project-structure)

---

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Runtime    | Node.js 20, TypeScript 5            |
| Framework  | NestJS 10                           |
| Database   | PostgreSQL 16 via TypeORM           |
| Queue      | BullMQ + Redis 7 (optional)         |
| Validation | class-validator / class-transformer |
| Docs       | Swagger / OpenAPI (`/api`)          |
| Testing    | Jest 29 + ts-jest, Supertest        |

---

## Prerequisites

- **Node.js** ≥ 20 (only needed if running outside Docker)
- **Docker + Docker Compose**

---

## Quick Start

### Option A — fully containerised (recommended)

```bash
# 1. Clone the repo
git clone <repo-url>
cd interview-takehome-be

# 2. Copy the example env file and adjust if needed
cp .env.example .env

# 3. Build and start everything (API + Postgres + Redis)
#    Migrations and seeding run automatically on first start
docker compose up --build
```

### Option B — local Node, Docker for infrastructure

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd interview-takehome-be
npm install

# 2. Start Postgres and Redis
docker compose up -d postgres redis

# 3. Copy the example env file and adjust if needed
cp .env.example .env

# 4. Run migrations, then seed sites & trucks
npm run migration:run
npm run seed

# 5. Start the dev server
npm run start:dev
```

The API is available at `http://localhost:3000`.  
Interactive Swagger docs: `http://localhost:3000/api`.

---

## Environment Variables

Copy `.env.example` to `.env`. All variables and their defaults:

```dotenv
NODE_ENV=development
PORT=3000

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=soilflo
POSTGRES_PASSWORD=soilflo
POSTGRES_DB=soilflo

# Redis — only required when QUEUE_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

# Feature flags
QUEUE_ENABLED=false   # set to true to route POST /tickets through BullMQ
```

---

## Database Setup

### Migrations

```bash
# Apply all pending migrations
npm run migration:run

# Generate a new migration after entity changes
npm run migration:generate -- src/database/migrations/<MigrationName>

# Revert the last migration
npm run migration:revert
```

### Seeding

Loads `SitesJSONData.json` (~100 k sites) and `TrucksJSONData.json` (~1 k trucks) into the database. This is idempotent — safe to re-run.

```bash
npm run seed
```

---

## Running the App

```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

---

## API Reference

Base URL: `http://localhost:3000`  
Full interactive docs with request/response schemas: `GET /api`

### Tickets

| Method | Path                   | Description                                                                          |
| ------ | ---------------------- | ------------------------------------------------------------------------------------ |
| `POST` | `/tickets`             | Bulk-create tickets for a truck. Returns `201` (sync) or `202 + jobId` (queue mode). |
| `GET`  | `/tickets`             | List all tickets. Filterable by `siteId`, `startDate`, `endDate`. Paginated.         |
| `GET`  | `/tickets/jobs/:jobId` | Poll async job status (only meaningful when `QUEUE_ENABLED=true`).                   |

#### POST /tickets — request body

```json
{
  "tickets": [
    {
      "truckId": 1,
      "dispatchedAt": "2024-06-15T10:30:00.000Z",
      "material": "Soil"
    }
  ]
}
```

Business rules enforced:

- `dispatchedAt` cannot be a future date
- No two tickets for the same truck may share the same `dispatchedAt` timestamp
- Ticket numbers are auto-incremented **per site** (advisory-lock protected)

#### GET /tickets — query parameters

| Param       | Type         | Description                              |
| ----------- | ------------ | ---------------------------------------- |
| `siteId`    | `number`     | Filter to a specific site                |
| `startDate` | `YYYY-MM-DD` | Inclusive lower bound on `dispatchedAt`  |
| `endDate`   | `YYYY-MM-DD` | Inclusive upper bound on `dispatchedAt`  |
| `page`      | `number`     | Page number (default `1`)                |
| `limit`     | `number`     | Items per page (default `50`, max `200`) |

#### Ticket response shape

```json
{
  "data": [
    {
      "id": "uuid",
      "ticketNumber": 42,
      "material": "Soil",
      "status": "Active",
      "dispatchedAt": "2024-06-15T10:30:00.000Z",
      "siteName": "Site Alpha",
      "truckLicense": "KDD 123"
    }
  ],
  "meta": { "page": 1, "limit": 50, "total": 1 }
}
```

### Sites

| Method | Path         | Description                                             |
| ------ | ------------ | ------------------------------------------------------- |
| `GET`  | `/sites`     | List all sites (paginated, searchable by name/address). |
| `GET`  | `/sites/:id` | Get a single site by ID.                                |

### Trucks

| Method | Path          | Description                                                                   |
| ------ | ------------- | ----------------------------------------------------------------------------- |
| `GET`  | `/trucks`     | List all trucks (paginated, filterable by `siteId`, searchable by `license`). |
| `GET`  | `/trucks/:id` | Get a single truck by ID.                                                     |

---

## Queue Mode (BullMQ)

When `QUEUE_ENABLED=true`, `POST /tickets` enqueues the job instead of processing it synchronously:

1. Response is `202 Accepted` with `{ "jobId": "..." }`.
2. Poll `GET /tickets/jobs/:jobId` to check status (`waiting`, `active`, `completed`, `failed`).
3. On completion the response includes the created tickets; on failure it includes `failedReason`.

Redis must be reachable (configure via `REDIS_HOST` / `REDIS_PORT` / `REDIS_DB`). Docker Compose starts Redis automatically.

Job failures are written to `logs/error.log` in NestJS log format.

---

## Testing

```bash
# Unit tests
npm run test

# Unit tests in watch mode
npm run test:watch

# Unit tests with coverage report (threshold: 85% stmts/branches/lines/funcs)
npm run test:cov

# End-to-end tests (requires a running Postgres — uses .env.test)
npm run test:e2e

# E2E with coverage
npm run test:e2e:cov
```

---

## Project Structure

```
src/
├── app.module.ts               # Root module (conditionally wires BullMQ)
├── main.ts                     # Bootstrap; loads .env before any module code
├── preload-env.ts              # dotenv loader (imported first in main.ts)
│
├── database/
│   ├── migrations/             # TypeORM migration files
│   └── seeds/                  # Data seeders for sites & trucks
│
├── modules/
│   ├── sites/
│   │   ├── application/        # Service, query DTO
│   │   ├── domain/             # Entity, repository interface
│   │   ├── infrastructure/     # TypeORM repository
│   │   └── presentation/       # Controller, response DTO
│   ├── tickets/
│   │   ├── application/        # Service, processor, queue service, DTOs
│   │   ├── domain/             # Entity, enums, repository interface
│   │   ├── infrastructure/     # TypeORM repository
│   │   └── presentation/       # Controller, response DTOs
│   └── trucks/
│       ├── application/        # Service, query DTO
│       ├── domain/             # Entity, repository interface
│       ├── infrastructure/     # TypeORM repository
│       └── presentation/       # Controller, response DTO
│
└── shared/
    ├── filters/                # HttpExceptionFilter (logs 5xx to file)
    ├── interceptors/           # TransformInterceptor, LoggingInterceptor
    ├── pagination/             # PaginationQueryDto, PaginatedResultDto
    ├── utils/                  # error-log.ts (shared file-log utility)
    └── validators/             # IsNotFutureDate custom validator
```

---

## Adding a New Module

Use the NestJS CLI to scaffold a new module. For example, to add a `drivers` module:

```bash
nest g mo modules/drivers
nest g co modules/drivers/presentation/drivers --flat
nest g s modules/drivers/application/drivers --flat
```

The CLI auto-registers each generated class in its module. You will still need to create the layered subfolders (`domain/`, `infrastructure/`) and add the entity, repository interface, and TypeORM repository by hand to match the existing structure.

To see all available generators:

```bash
nest generate --help
```