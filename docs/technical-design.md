# Technical Design: Candidate Management System

| | |
|---|---|
| **Status** | Implemented |
| **Scope** | REST API, database schema and web UI for tracking candidates through a hiring pipeline |
| **See also** | [README](../README.md) for setup and API reference |

## 1. Goals and non-goals

**Goals**

- Create, view, edit, delete and search candidates through a REST API and a web UI.
- Keep search and filtering fast as the table grows (benchmarked at 100,000 rows).
- Keep the design small enough to understand in one sitting: one service, one table, one database.

**Non-goals (not built)**

- Authentication, roles or multi-tenancy.
- Multiple jobs, interview scheduling, document uploads or notifications.
- Multi-instance deployment, full-text relevance ranking, or an audit trail.

## 2. Architecture

```
React SPA  --/api-->  Spring Boot REST API  --JDBC (HikariCP)-->  PostgreSQL (Neon)
(Vite)                Controller > Service > Repository
```

| Component | Choice | Responsibility |
|---|---|---|
| Frontend | React 19, Vite, Tailwind | UI, client-side validation, debounced search, paging |
| API | Spring Boot 4, Java 21 | HTTP contract, validation, business rules, transactions, caching |
| Data access | Spring Data JPA + Hibernate | Dynamic filters built as JPA Specifications |
| Database | PostgreSQL 18 on Neon | Storage and all search indexes |
| Schema tooling | Prisma | Owns table, enum and index definitions |

The API is layered: controllers handle HTTP only, services own rules and transactions, repositories own queries. Requests and responses are separate DTO records; the JPA entity never leaves the service layer.

## 3. Data model

One table, `candidate`: id, first and last name, email (unique), phone, skills, years of experience, company, location, status (native Postgres enum with six pipeline stages), and created and updated timestamps.

Two columns exist purely for search and are maintained by the application:

- `email` is always stored lowercase.
- `skills_search` is a lowercased copy of `skills`.

## 4. API design

| Operation | Endpoint |
|---|---|
| Create / read / update / delete | `POST`, `GET`, `PUT`, `DELETE` on `/api/candidates[/{id}]` |
| Search and filter | `GET /api/candidates?name&email&location&skills&minExperience&maxExperience&status&page&size` |
| Dashboard numbers | `GET /api/candidates/stats` |

- Filters combine with AND. The list is paged (default 20, hard cap 100), newest first.
- Errors use RFC 7807 problem responses: `400` validation, `404` unknown id, `409` duplicate email.
- `PUT` replaces all fields (no partial update).

## 5. Key decisions

| # | Decision | Alternatives considered | Trade-off accepted |
|---|---|---|---|
| 1 | **Prisma owns the schema; Hibernate runs `ddl-auto=validate`** | Hibernate generating DDL; Flyway or Liquibase | Two tools to know, and the entity must be kept in step with the schema by hand (startup fails if they disagree). `prisma db push` leaves no migration history. |
| 2 | **Substring search with trigram GIN indexes** (`ILIKE '%x%'`) | Plain btree on `lower(col)` (cannot serve a leading wildcard); a search engine | Larger indexes and slower writes; no relevance ranking, stemming or typo tolerance. |
| 3 | **Skills stored as `text[]` plus a lowercased `skills_search` column with a GIN index** (`@>` containment) | Join table; JSONB; `lower()` expression index | Duplicated data that the app must keep in sync. In return the filter is indexed, case-insensitive and matches whole skills only (`java` does not match "JavaScript"). |
| 4 | **Email stored lowercase, plain unique index** | `citext` column; unique index on `lower(email)` (Prisma cannot model it) | Anything writing directly to the table must lowercase emails itself. |
| 5 | **The unique index is the source of truth for duplicates**; a violation becomes `409` | Check-then-insert | Relies on matching the constraint name in the error text. Removes a query per write and the race between concurrent creates. |
| 6 | **Offset pagination, capped at 100 per page** | Keyset (cursor) pagination | Very deep pages get slower, but total counts and page numbers are easy. |
| 7 | **Stats from one aggregate query, cached 30 s in memory**, cleared on every write | Compute in the browser; no cache | The cache is per instance. A second instance would show stale numbers for up to 30 s. |
| 8 | **Dev-server proxy for `/api`** | CORS on the API | Production needs the SPA served from the same origin, or CORS added. |
| 9 | **Embedded PostgreSQL for integration tests** | H2; Testcontainers (needs Docker running) | Adds about 30 s per run. Tests exercise real `ILIKE`, arrays and enums, which H2 cannot. |

## 6. Performance design

Measured on 100,000 synthetic rows (database time only; see the README for the full table):

| Query | Before | After |
|---|---|---|
| Name, email, location, skills, status filters | 8-45 ms (full scan) | 0.1-2.3 ms (index) |
| Duplicate-email check | 12.7 ms | under 0.1 ms |
| Dashboard stats | 9.8 ms | 13.4 ms (not faster; the gain is no longer sending every row to the browser) |

Other measures: pagination instead of returning every row, one round trip for create and delete, no SQL logging or open-session-in-view by default, a bounded connection pool (10) with a 5 s acquire timeout, gzip responses, virtual threads.

## 7. Consistency and failure behavior

- **Concurrent creates with one email:** exactly one succeeds and the rest get `409`; covered by a test with 10 simultaneous requests.
- **Updates:** last write wins. There is no optimistic locking or version field.
- **Cache:** evicted after a successful write method returns, which can be just before the transaction commits. A read in that gap can re-cache old numbers until the 30 s expiry.
- **Database cold start (Neon idle):** the first request after idle can be slow, and with a 5 s pool timeout it can fail. Retrying succeeds.

## 8. Security

There is **no authentication or authorization**; anyone who can reach the API can read and change all data. Input is validated (required fields, email format, non-negative experience, enum values), SQL values are always bound parameters, and `%` and `_` in search text are escaped so they match literally. Credentials live in git-ignored files. This is acceptable for a local or demo setup only.

## 9. Testing strategy

| Layer | Approach |
|---|---|
| Service | Unit tests with a mocked repository |
| Controller | Web-layer tests with a mocked service (binding, validation, status codes) |
| Persistence and API | Integration tests on a real embedded PostgreSQL, schema generated from `schema.prisma` |
| Indexes | Tests that fail if a filter becomes un-indexable |
| Frontend | Component and App tests in jsdom against a fake in-memory API |

Not covered: browser end-to-end tests, load tests, CI.

## 10. Risks and future work

| Risk or gap | Mitigation or next step |
|---|---|
| No authentication | Add Spring Security with a login or JWT before any real deployment |
| Schema changes have no history | Baseline the database and move to `prisma migrate` |
| App-maintained columns can drift if written to directly | `npm run db:backfill` repairs rows; a database trigger would enforce it everywhere |
| Offset paging degrades on deep pages | Move to keyset pagination if the table reaches millions of rows |
| Stats aggregate still reads every row | Maintained counters or a materialized view at much larger scale |
| Per-instance cache | Shared cache (such as Redis) or drop the cache before running several instances |
| No automated pipeline | GitHub Actions running both test suites on every push |
| No interactive API docs or metrics | OpenAPI/Swagger UI; Actuator and metrics |
