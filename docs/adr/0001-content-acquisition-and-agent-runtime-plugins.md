# ADR 0001: Content acquisition and agent runtime plugins

Status: Accepted  
Date: 2026-08-10

## Context

Sales Radar already has a trusted production path:

`SearchTask → AgentReach/Exa → SearchEvidence → RadarAssessment → Opportunity`

The next capabilities must improve page depth and agent execution without allowing an external crawler, model, or runtime to create customer truth.

## Decision

### Content acquisition

Crawl4AI is an optional provider behind `ContentProvider`. It receives only a URL that already came from the real search provider and passed a public-target validator. Its output may enrich the stored page content and metadata, but it cannot create an Opportunity, Lead, Contact, or MarketSignal by itself.

If Crawl4AI is disabled, unavailable, times out, returns invalid data, or fails target validation, the original AgentReach/Exa content remains the evidence used by the existing pipeline. Social/video sources are not sent to the general crawler; they retain Tier 3 provenance for a future dedicated adapter.

Security constraints:

- use Crawl4AI `>= 0.9.0`;
- send no hooks, browser launch arguments, scripts, or provider credentials;
- block credentialed, local, and private-network targets before acquisition;
- cap acquired content and request time;
- never log tokens or full provider errors.

### Agent runtime

Sales Agent execution is behind `AgentRuntime`. The current OpenAI implementation remains the default. A LiveKit-compatible deployment may be selected through an HTTP bridge that implements the same request/result contract.

The LiveKit adapter does not import SearchTask, Opportunity persistence, Lead qualification, or CRM repositories. It can orchestrate existing authenticated Sales Agent tools, but it cannot bypass their permissions.

### Revenue execution

External browser execution requires explicit user action through the protected Revenue Live API. The background loop may reconcile an existing run, but cannot select an opportunity or start a provider session.

## Consequences

- Existing production behavior remains the default when no new environment variables are set.
- SearchEvidence gains additive provenance and acquisition metadata without a Prisma migration.
- Radar responses gain additive evidence quality/freshness fields; Decision and score models are unchanged.
- LiveKit can be deployed independently from the backend and removed without changing business services.
- Provider-specific observability remains necessary before enabling either plugin in production.

## Rejected alternatives

- Replacing AgentReach/Exa with Crawl4AI: rejected because discovery and content acquisition are separate responsibilities.
- Letting crawler results directly create Opportunities: rejected by Evidence First and Opportunity Integrity boundaries.
- Importing LiveKit directly into SearchTask: rejected because real-time agent execution and search persistence have different lifecycles.
- Automatic Revenue execution for high-scoring opportunities: rejected because score is an assessment, not user authorization.
