# Answers & Discussion

Responses to the take-home challenge discussion points.

---

## 1. How did you approach the problem?

I started by reading the brief and the provided JSON data files to understand the domain before writing any code. From that I identified three core resources — **Sites**, **Trucks**, and **Tickets** — and modelled their relationships: a truck belongs to a site, a ticket references both a site and a truck.

I then chose a layered architecture (presentation → application → domain → infrastructure) inside a NestJS module-per-feature structure. This keeps concerns separated without over-engineering for the scope of a take-home:

- **Presentation** — controllers and request/response DTOs with validation
- **Application** — service layer containing business logic
- **Domain** — entity definitions and repository interfaces
- **Infrastructure** — TypeORM repository implementations

For the ticket numbering I used a **PostgreSQL advisory lock** around a per-site counter table rather than relying on sequences or application-level locking. This keeps the numbering correct under concurrent writes without introducing a distributed-lock dependency.

The queue path (`QUEUE_ENABLED=true`) uses **BullMQ** so that bulk ticket creation can be offloaded asynchronously. The same `POST /tickets` endpoint returns `201` (sync) or `202 + jobId` (async) depending on the flag, keeping the surface area minimal.

---

## 2. What assumptions did you make?

- **Ticket numbers are per-site, not global.** The brief showed numbers like `SITE-001`, implying each site has its own sequence. I implemented a `site_ticket_counters` table to track this.
- **Truck–site relationship is enforced at the DB level.** A ticket's truck must belong to the same site as the ticket. This is validated in the service layer before insert.
- **Idempotency is not required for the seed.** The seeder checks for existing rows and skips re-insertion, but it does not guarantee exactly-once delivery across concurrent seed runs.
- **The JSON data files are the source of truth for initial seed data.** `SitesJSONData.json` and `TrucksJSONData.json` are loaded at startup in Docker; no admin UI or import endpoint is needed.
- **`QUEUE_ENABLED` is an infrastructure toggle, not a per-request flag.** All requests go through the same code path determined at app startup.
- **Pagination defaults (page 1, limit 20) are acceptable** for list endpoints given the dataset size implied by the brief.

---

## 3. If you had more time, what would you add?

**Security**

- **Authentication & authorisation** — even a simple API-key guard would make the service safe to expose. Currently every endpoint is publicly accessible.
- **Rate limiting** — throttle the `POST /tickets` endpoint to prevent a single caller from exhausting the connection pool with unbounded bulk requests.
- **Input array size cap** — add `@ArrayMaxSize(500)` to `BulkCreateTicketsDto`; without it a single request could send 100K items and OOM the process.
- **Security headers** — add `helmet` and an explicit CORS policy in `main.ts`.

**Scalability**

- **Cursor / keyset pagination** — replace `OFFSET`/`LIMIT` on the tickets list with keyset pagination on `dispatched_at`. At page 500,000 PostgreSQL scans and discards offset rows, making it O(n) slow.
- **Table partitioning** — partition the `tickets` table by month (`PARTITION BY RANGE (dispatched_at)`). A single 100M-row table is manageable but monthly partitions give 10–100× improvement on date-range queries.
- **Connection pool configuration** — set explicit pool bounds (`max`, `idleTimeoutMillis`, `statement_timeout`) in `data-source.ts`. TypeORM defaults to 10 connections, which starves under real load.

**Operational / Production readiness**

- **Retry & dead-letter handling** in BullMQ — a failed job is currently lost. A DLQ with alerting would make the async path production-ready.
- **Structured JSON logging** (e.g. Pino) with a correlation/request ID per request, replacing the current file-based error log. This integrates cleanly with log aggregation platforms.
- **Health check endpoint** — a `/health` route that probes the database and Redis, rather than the current welcome-message controller.
- **Decouple seeding from container startup** — move the seed step to a one-shot init job so a pod restart doesn't re-run the seeder against a live database.

**Developer experience**

- **E2E / integration tests** against a real test database so the full HTTP → DB round-trip is covered, not just unit tests with mocked repositories.
- **OpenAPI / Swagger documentation** via `@nestjs/swagger` — the DTOs are already decorated with `class-validator`; adding Swagger decorators is low-effort and greatly improves the API contract.
- **Prometheus metrics** — request latency histograms and error-rate counters for observability in production.

---

## 4. LLM Usage Disclosure

I used **GitHub Copilot** as a pair-programming assistant throughout this challenge, in the following ways:

- **Architecture planning:** Discussed layered structure, and technology trade-offs before writing code.
- **Code generation:** Copilot helped scaffold boilerplate (module registration, entity stubs, test structure) which I then reviewed and refined.
- **Debugging:** Used Copilot to troubleshoot runtime issues such as the missing `rootDir` in `tsconfig.build.json` and the local `dist/` folder polluting the Docker build context.
- **Documentation:** Copilot helped generate the README and inline code documentation.

All generated code was read, understood, and validated by me before being accepted. The architecture decisions, data-model choices, and the advisory-lock approach to ticket numbering were my own.