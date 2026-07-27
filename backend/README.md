# Sales Radar AI Backend

Independent Node.js, TypeScript, Express, Prisma, and PostgreSQL backend.

## Development

1. Copy `.env.example` to `.env`.
2. Configure `DATABASE_URL` and `JWT_SECRET`.
3. Install the locked backend dependencies.
4. Run `npm run prisma:generate`.
5. Run `npm run dev`.

## Mock core flow

- `GET /api/health`
- `POST /api/search-task`
- `GET /api/search-task/:id`
- `GET /api/leads`
- `GET /api/leads/:id`
- `POST /api/leads/:id/analyze`

Search tasks use an in-process mock provider. AI analysis is deterministic
mock output. No authentication, real AI, browser automation, or third-party
platform access is enabled.
