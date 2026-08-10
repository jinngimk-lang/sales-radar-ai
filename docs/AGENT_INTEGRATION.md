# Agent Integration Guide

Sales Radar AI is designed for both coding agents that improve the repository and runtime agents that help a sales user complete evidence-backed research.

## 1. Coding agents

Any coding agent with repository access can use the project without a vendor-specific plugin:

1. Read [`AGENTS.md`](../AGENTS.md).
2. Read [`CONTEXT.md`](../CONTEXT.md).
3. Select the relevant rules from [`.agent/SKILL_REGISTRY.md`](../.agent/SKILL_REGISTRY.md).
4. Follow the referenced `SKILL.md` files.
5. Run the verification commands in [`agent-manifest.json`](../agent-manifest.json).

The `.agent/skills` directory contains project policy, not hidden prompts or provider credentials. Agent runners may map these Markdown files into their own instruction mechanism.

## 2. Runtime agents

Runtime agents call the Sales Radar backend through documented HTTP endpoints. The machine-readable subset is [`docs/openapi/agent-api.yaml`](openapi/agent-api.yaml).

Typical workflow:

```text
POST /api/search-task
  -> poll GET /api/search-task/{id}
  -> GET /api/search-task/{id}/results
  -> GET /api/radar/assessments?searchTaskId={id}
  -> inspect an evidence-linked Opportunity
  -> GET /api/opportunities/{id}/research-trace
  -> POST /api/assistant/agent with explicit user context
```

### Workspace identity

The current application can attach a single demo workspace identity. Several intelligence endpoints reject missing identity in production and every service enforces workspace ownership. A multi-tenant deployment must replace the demo middleware with its own authenticated user context before exposing the API to third parties.

Do not remove ownership checks to make an agent integration easier. Put the agent behind the same authenticated session or trusted gateway as the user.

### Safe runtime behavior

Runtime agents may:

- submit a user-authored search objective;
- poll task state;
- read workspace-owned SearchEvidence-derived results;
- read Radar assessments and their reason codes;
- read evidence-linked opportunities and research traces;
- ask the Sales Agent for analysis, strategy or a draft.

Runtime agents may not:

- create evidence, companies, people or purchase events from model memory;
- call database persistence directly;
- promote RadarAssessment into Opportunity or Lead;
- bypass OpportunityEvidence or Lead Quality Gate;
- send external messages, start live sessions or change revenue state without the protected user action;
- expose provider keys, operator tokens or private workspace data.

## 3. Provider extensions

New search, crawler or agent-runtime integrations belong behind existing interfaces:

- Search provider: `backend/src/providers/search/search-provider.interface.ts`
- Content acquisition: `backend/src/providers/content/content-provider.interface.ts`
- Agent runtime: `backend/src/providers/agent-runtime/agent-runtime.interface.ts`

An adapter must preserve source URL, provenance, observed time, provider failure semantics and workspace ownership. It must not generate fallback companies or opportunities when the external service is unavailable.

## 4. Example search request

```bash
curl -X POST "$SALES_RADAR_API/api/search-task" \
  -H "Content-Type: application/json" \
  -H "Cookie: $SALES_RADAR_SESSION" \
  -d '{
    "keyword": "industrial automation SaaS for European manufacturers",
    "platforms": [],
    "regions": [],
    "maxResults": 10,
    "productContext": {
      "product": "industrial automation SaaS",
      "industry": "industrial manufacturing",
      "region": "Europe",
      "customerType": "manufacturing companies"
    }
  }'
```

The `202 Accepted` response creates a task; it does not prove provider success. Poll the task until `COMPLETED` or `FAILED`, then read the task-owned result and assessment endpoints.

## 5. Traceability contract

Agent-facing output should retain, when available:

- input references;
- source references and URLs;
- capture or publish time;
- assessment reasons and reason codes;
- provider/detection version where safe;
- timestamp;
- explicit unknown or needs-review state.

Provider keys, raw private prompts, cookies and model credentials are never part of this trace.
