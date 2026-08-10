# Intelligence Runtime Deployment

## Production data flow

```text
User search goal
  → SearchTask
  → AgentReach / authenticated Exa
  → real provider result
  → source provenance
  → optional Crawl4AI page enrichment
  → SearchEvidence
  → RadarAssessment
  → MarketSignal and existing Opportunity Integrity path
  → user-selected Sales Agent action
  → optional LiveKit runtime bridge
  → explicit Revenue Live execution
```

The boundaries remain:

`Source ≠ Evidence ≠ Fact ≠ Assessment ≠ Opportunity ≠ Customer`

## Capability states

| Capability | Disabled | Ready | Degraded behavior |
| --- | --- | --- | --- |
| AgentReach / Exa | SearchTask fails with a user-safe provider status | Real URLs enter SearchEvidence | No mock/fallback results |
| Crawl4AI | Original provider content is retained | Public web pages may enrich content | Failure retains original evidence |
| Social provenance | N/A; classification is local | Platform and Tier 3 are recorded | Unknown remains Unknown |
| OpenAI agent runtime | Sales Agent reports missing configuration | Existing tool-calling agent runs | No fabricated response |
| LiveKit runtime bridge | Not selected | Same Sales Agent contract is delegated | Request fails safely; no OpenAI auto-switch |
| Revenue Live | No external session | User explicitly starts an owned opportunity | Background loop only reconciles active runs |

## Crawl4AI deployment

Deploy Crawl4AI as a separately isolated service. The supported contract is:

```http
POST {CRAWL4AI_BASE_URL}/crawl
Content-Type: application/json
Authorization: Bearer {CRAWL4AI_API_TOKEN} # optional

{"urls":["https://public.example/article"]}
```

Configure the backend:

```dotenv
CONTENT_ACQUISITION_PROVIDER=crawl4ai
CRAWL4AI_BASE_URL=https://your-crawl-service.example
CRAWL4AI_API_TOKEN=
CRAWL4AI_TIMEOUT_MS=15000
```

Use Crawl4AI `>= 0.9.0`. Deny access from the crawler service to cloud metadata endpoints, databases, internal control planes, and private application networks. The backend performs an additional public URL check, but network isolation remains required.

## LiveKit-compatible agent runtime

The backend does not require LiveKit when using the default OpenAI agent. To use an independently deployed runtime bridge:

```dotenv
AGENT_RUNTIME_PROVIDER=livekit
LIVEKIT_AGENT_RUNTIME_URL=https://your-agent-runtime.example
LIVEKIT_AGENT_RUNTIME_TOKEN=
LIVEKIT_AGENT_RUNTIME_TIMEOUT_MS=30000
```

The bridge must implement:

```http
POST /v1/agent/runs
Authorization: Bearer {LIVEKIT_AGENT_RUNTIME_TOKEN}
Content-Type: application/json
```

It receives the existing Sales Agent input and returns `{ data: SalesAgentRunResult }`. The bridge must preserve authentication context, tool permissions, approval requirements, source references, and trace IDs. It must not write Opportunity, Lead, Contact, or CRM state directly.

## Rollout order

1. Deploy with all new providers disabled; verify existing SearchTask and Sales Agent behavior.
2. Enable Crawl4AI in staging for official web/news sources only.
3. Check acquisition success/failure ratios, content size, freshness, and private-target rejections.
4. Enable the LiveKit bridge for an internal workspace and verify identical tool permissions.
5. Keep Revenue Live loop disabled until the protected user-triggered workflow is verified.
6. Promote providers independently; rollback is an environment variable change.

## Acceptance checks

- every displayed item has a real source URL;
- Radar exposes source, captured/published time when known, freshness, quality, risk, and reason codes;
- social content remains a clue unless corroborated;
- crawler failure never deletes SearchEvidence or turns into an opportunity fact;
- the Sales Agent can invoke existing search/research tools through either runtime;
- Revenue Live starts only after the protected user action.
