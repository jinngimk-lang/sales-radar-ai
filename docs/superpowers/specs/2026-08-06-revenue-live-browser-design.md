# Revenue Live Browser Operations Design

## Goal

Add a truthful, secure real-time operations area to the Sales Radar AI revenue console. The area must show browser sessions that the Sales Radar AI backend actually starts and supervises. It must not claim that ChatGPT connector activity, hidden reasoning, or unrelated platform tooling is being streamed.

## Scope

This change adds:

- an operator-gated cloud-browser panel inside `/app/revenue`
- Browserbase Agent runs started by the backend through the official REST API
- Browserbase Live View embedded when a real provider session exists
- a sanitized, auditable event stream derived from provider run messages
- a safe start/stop/reconcile API
- an optional server-side exploration loop that is disabled until explicitly configured

This change does not add:

- public access to a browser debugger URL
- arbitrary shell, browser, or URL control from the UI
- automatic login, form submission, purchases, KYC, payment, wallet, or legal acceptance
- a representation of private assistant reasoning or internal ChatGPT tool calls

## Selected approach

Use Browserbase Agents through native `fetch` rather than adding a browser automation dependency. A run is created with `POST /v1/agents/runs`; its status and messages are polled through the official run endpoints. Once the provider returns a Browserbase session ID, the backend requests `/v1/sessions/{id}/debug` and exposes only the temporary debugger Live View URL to an authenticated operator.

The backend never returns Browserbase API keys, session connect URLs, WebSocket URLs, Selenium URLs, or signing keys.

## Architecture

### Frontend

Add a focused `RevenueLiveOpsPanel` above the opportunity queue.

The panel has four states:

1. **Locked** — asks for an operator token. The token is kept in `sessionStorage`, never local storage or source code.
2. **Provider unavailable** — states that the cloud-browser provider is not configured. No simulated video is shown.
3. **Waiting** — shows loop status, last heartbeat, and a button to start a safe read-only exploration run.
4. **Live** — embeds the provider Live View, shows current page metadata, run state, elapsed time, event timeline, and a stop control.

The frontend polls the protected status endpoint every two seconds while operator mode is unlocked. Live video itself is delivered by Browserbase through the provider debugger URL.

### Backend API

Protected routes under `/api/revenue/live`:

- `GET /status` — reconcile the latest run, ingest new provider messages, and return safe status, events, current page, and Live View URL.
- `POST /runs` — start one server-generated read-only exploration task. The server selects the highest-priority eligible revenue opportunity unless a valid owned opportunity ID is supplied.
- `POST /runs/:id/stop` — request release of the provider browser session and mark the local run stopped.

All three routes require `Authorization: Bearer <REVENUE_OPERATOR_TOKEN>`.

### Provider adapter

`browserbase-agent.provider.ts` owns Browserbase HTTP calls. It uses:

- `BROWSERBASE_API_KEY`
- `BROWSERBASE_BASE_URL` with default `https://api.browserbase.com`

Supported operations:

- create agent run
- retrieve run
- list messages using a cursor
- retrieve session debug URLs
- request session release

Every request has a timeout and converts provider failures into sanitized application errors.

### Persistence

Create tables lazily, following the existing revenue module pattern:

#### RevenueLiveRun

- `id`
- `userId`
- `opportunityId`
- `providerRunId`
- `providerSessionId`
- `status`
- `taskSummary`
- `targetUrl`
- `currentUrl`
- `currentTitle`
- `messageCursor`
- `resultSummary`
- `errorCode`
- `errorMessage`
- `startedAt`
- `endedAt`
- timestamps

#### RevenueLiveEvent

- `id`
- `runId`
- `userId`
- `providerMessageId`
- `kind`
- `level`
- `message`
- `detail`
- `occurredAt`
- timestamp

Provider message IDs are unique per run so polling remains idempotent.

## Data flow

1. Operator unlocks the panel with the configured token.
2. Frontend requests `/status`.
3. Backend loads the current run and reconciles it against Browserbase.
4. New provider messages are sanitized and persisted.
5. When a provider session ID exists, the backend retrieves debug metadata.
6. Backend returns the temporary Live View URL and safe event data.
7. Frontend embeds the Live View and refreshes metadata every two seconds.
8. When the run finishes, the backend stores the result summary and final status; the recording remains governed by the Browserbase account policy.

## Task policy

The server generates the task. The UI cannot send an arbitrary prompt.

The task permits only read-only research:

- open the selected public opportunity source
- identify payout terms, eligibility, scope, deadlines, competition, required deliverables, and evidence
- follow public links needed to verify those facts
- report uncertainty and source URLs

The task explicitly prohibits:

- authentication or account creation
- form submission or communication
- accepting terms
- KYC or identity handling
- wallet, bank, payment, purchase, deposit, withdrawal, trading, or leverage
- downloading or executing files
- security testing, scanning, exploitation, or secret collection
- bypassing access controls, CAPTCHAs, or robots restrictions

## Security boundaries

### Operator gate

`REVENUE_OPERATOR_TOKEN` is compared using constant-time digest comparison. Missing configuration produces a locked/unavailable response, not a permissive fallback.

### URL protection

The backend accepts only owned revenue opportunities already stored in the workspace. It validates their source URL again before use and rejects:

- non-HTTP protocols
- embedded credentials
- localhost and local hostnames
- loopback, private, link-local, multicast, and unspecified IP ranges
- URLs whose host resolves to a literal private IP

Query strings and fragments are removed from user-visible event output unless needed for the provider request. Sensitive parameter names are never logged.

### Provider secret protection

The browser provider API key stays server-side. The response schema excludes provider connection URLs and signing material. Only the debugger URL required for Live View may be returned after operator authorization.

### Public application behavior

The existing revenue dashboard may remain viewable in demo mode, but browser session metadata, live URLs, events, and controls remain protected by the operator gate.

## Optional continuous loop

The backend may start a read-only run automatically only when all of the following are true:

- `REVENUE_LIVE_LOOP_ENABLED=true`
- Browserbase is configured
- an eligible opportunity exists
- no active run exists
- the minimum interval has elapsed

Configuration:

- `REVENUE_LIVE_LOOP_ENABLED=false` by default
- `REVENUE_LIVE_LOOP_INTERVAL_MINUTES=30` by default

The loop is deliberately disabled by default because a cloud-browser provider may incur usage charges. Enabling it is an explicit infrastructure action, not an application assumption.

## Error handling

- Provider not configured: return `configured: false`; do not throw for status reads.
- Invalid operator token: return 401 without revealing whether the provider is configured.
- Provider timeout/rate limit: retain the run, add one sanitized warning event, and retry on the next poll.
- Railway restart during a run: recover from persisted provider run ID on the next status request.
- Missing provider session: show run progress and events without a video frame until a session ID appears.
- Live View embedding failure: preserve an authenticated “open live view” link.
- Stop failure: mark stop requested, retain the error event, and retry session release during reconciliation.

## Testing

### Frontend

- the revenue page includes a real cloud-browser operations section
- locked mode is the default
- Live View renders only from backend-provided debugger URL
- the UI labels unconfigured state honestly and does not use mock video

### Backend

- operator token verification uses a constant-time digest comparison
- private and local URLs are rejected
- public HTTPS opportunity URLs are accepted
- generated tasks contain all read-only restrictions
- provider requests use the official Browserbase endpoints and `X-BB-API-Key`
- provider messages are sanitized and idempotently persisted
- debugger responses do not expose connection or signing fields
- an opportunity from another workspace cannot start a run

## Deployment requirements

Railway environment variables required for live operation:

- `REVENUE_OPERATOR_TOKEN`
- `BROWSERBASE_API_KEY`

Optional:

- `BROWSERBASE_BASE_URL`
- `REVENUE_LIVE_LOOP_ENABLED`
- `REVENUE_LIVE_LOOP_INTERVAL_MINUTES`

No Browserbase secret is required in Vercel.

## Success criteria

- A configured operator can start a read-only provider run from `/app/revenue`.
- The page shows the provider session Live View once Browserbase supplies a session ID.
- Events visibly update while the run progresses.
- An unauthenticated visitor cannot obtain a Live View URL, browser metadata, or controls.
- Provider keys and browser connection material never appear in frontend responses or logs.
- With provider configuration absent, the UI clearly reports that no real cloud browser is connected.
