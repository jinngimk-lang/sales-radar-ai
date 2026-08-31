# Railway Exit Plan

Status: implementation branch `agent/migrate-off-railway-20260831`

## Verified failure

The production frontend still serves successfully from Vercel, but `/api/*` was hard-wired in `vercel.json` to `https://sales-radar-ai-production.up.railway.app`. On 2026-08-31 the production health request returned Railway `404 Application not found`, confirming the frontend was proxying to a dead Railway application.

## Runtime constraint

Do not move the current backend to a request-only serverless runtime without redesigning background execution first.

The existing Express process intentionally owns two process-lifetime behaviors:

- SearchTask creation returns `202` and schedules `processSearchTask()` with `setImmediate()`.
- Revenue live reconciliation uses an in-process `setInterval()` loop.

A long-running container Web Service preserves those semantics with the smallest migration risk.

## Target topology

```text
Browser
  -> Vercel frontend
  -> /api/*
  -> Vercel backend-proxy function
  -> BACKEND_ORIGIN
  -> containerized Express backend
  -> Neon PostgreSQL
```

The frontend no longer contains a Railway hostname. Changing backend providers should require changing `BACKEND_ORIGIN`, not rebuilding API client code.

## First hosting experiment: Koyeb Free Web Service

Koyeb is the first migration target because it can build a GitHub repository from a Dockerfile and supports a monorepo work directory. Keep this as an experiment until deployment, health, search-task completion, and database persistence are verified.

Suggested service configuration:

- Source: GitHub `jinngimk-lang/sales-radar-ai`
- Branch during verification: `agent/migrate-off-railway-20260831`
- Service type: Web Service
- Builder: Dockerfile
- Work directory: `backend`
- Dockerfile: `Dockerfile`
- Exposed port: `8787`
- Route: `/`
- HTTP health check: `/api/health`
- Instance: Free while evaluating

The backend Docker image now runs `prisma migrate deploy` before `node dist/server.js`, so the deployment does not depend on Railway's pre-deploy hook.

### Required backend environment

At minimum:

```text
NODE_ENV=production
PORT=8787
DATABASE_URL=<Neon connection string>
JWT_SECRET=<long random secret>
```

Optional provider variables should be copied only from credentials already controlled by the Owner. Never commit them to Git.

For the first smoke test, provider keys are not required: the process and `/api/health` can be verified independently, and rule-based/degraded capability behavior should remain truthful when remote providers are absent.

## Database target: Neon PostgreSQL

The Prisma datasource already uses PostgreSQL through `DATABASE_URL`, so no ORM or schema rewrite is required.

Migration order:

1. Create a Neon project/database.
2. Set the backend `DATABASE_URL` to the Neon connection string.
3. Start the container; `prisma migrate deploy` applies committed migrations.
4. Verify `/api/health`.
5. Run a persisted read/write smoke path.
6. If the old Railway database remains accessible, export/import data separately before production cutover. Do not claim old data was migrated unless row-level verification succeeds.

## Vercel cutover

The frontend branch uses a same-origin proxy function and requires:

```text
BACKEND_ORIGIN=https://<backend-hostname>
```

After the backend is healthy, set `BACKEND_ORIGIN` on the Vercel Preview environment first and verify:

```text
GET /api/health
GET /api/health/capabilities
POST /api/search-task
GET /api/search-task/:id
GET /api/search-task/:id/results
```

Then run the Market Radar UI in the Preview deployment and confirm a real search task can progress from `PENDING/RUNNING` to a terminal state without fabricated results.

## Acceptance gate

This branch is not production-approved merely because CI or a preview build succeeds. Follow `PROJECT_WORKFLOW.md`:

1. automated checks;
2. backend health and persistence smoke;
3. Vercel Preview browser verification;
4. Owner local/real verification;
5. Owner explicit approval;
6. re-check latest `main`, diff, and fast-forward safety;
7. only then synchronize the approved commit(s) to `main`.

## Rollback

Before production synchronization, rollback is deleting the work branch.

After an approved production cutover, rollback is:

1. restore the previous Vercel deployment or point `BACKEND_ORIGIN` to the last known-good backend;
2. keep database rollback separate from application rollback;
3. never force-push `main`.
