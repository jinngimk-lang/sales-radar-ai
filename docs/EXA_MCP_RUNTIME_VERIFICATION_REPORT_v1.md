# Sales Radar AI — Exa MCP Runtime Verification v1

## 1. Executive result

Exa MCP runtime recovery is successful.

```text
mcporter: installed
Exa MCP: registered and healthy
Application provider health: AVAILABLE
Real SearchTask execution: COMPLETED
SearchTaskLead ownership: verified
Verified company/domain quality: not yet passed
```

No frontend or application business logic was modified during this task.

## 2. Environment verification

### Installed components

| Component | Status | Evidence |
| --- | --- | --- |
| Node.js | Installed | `v24.18.0` |
| npm | Installed | `11.16.0` |
| mcporter | Installed | `0.12.3` |
| Agent Reach skill | Installed | Skill exists under both `.agents/skills` and `.codex/skills` |
| Agent Reach CLI | Not installed | `agent-reach` command is not on PATH |
| Exa MCP | Registered | `C:\Users\Administrator\.mcporter\mcporter.json` |
| `EXA_API_KEY` | Not configured | Process, user, and machine scopes checked without printing secret values |

The missing Agent Reach CLI is not a blocker for the current application:
`AgentReachProvider` invokes mcporter directly.

### Initial mcporter state

Before recovery, mcporter discovered only the imported Codex `node_repl`
server. Exa was absent, so the application correctly returned:

```text
UNAVAILABLE / EXA_NOT_CONFIGURED
```

### Applied runtime configuration

Executed:

```powershell
mcporter config add exa https://mcp.exa.ai/mcp --scope home
```

Persisted configuration:

```json
{
  "mcpServers": {
    "exa": {
      "baseUrl": "https://mcp.exa.ai/mcp"
    }
  }
}
```

No credentials or API keys were written.

## 3. Runtime health verification

`mcporter list exa --schema --json` returned:

```text
name: exa
status: ok
transport: HTTP https://mcp.exa.ai/mcp
tools:
  - web_search_exa
  - web_fetch_exa
```

After restarting the backend, the application health endpoint returned:

```json
{
  "data": {
    "provider": "agent-reach",
    "dependency": "exa",
    "state": "AVAILABLE",
    "code": "OK",
    "message": "AgentReach runtime and Exa MCP are available."
  }
}
```

An unrelated imported `node_repl` server remains offline. It does not affect
the Exa-specific health state.

## 4. Direct Exa search verification

Executed:

```powershell
mcporter call "exa.web_search_exa(query: 'Find industrial automation SaaS companies in Europe', numResults: 3)"
```

The call returned real web content, including:

```text
Title: Manufacturing SaaS in Europe - 2026 Market & Investments Trends
URL: https://tracxn.com/d/explore/manufacturing-saas-startups-in-europe/...
```

This verifies external network access, MCP tool discovery, mcporter argument
format, and Exa execution.

## 5. End-to-end application search

### Search A — default platform strategy

Input:

```text
Find industrial automation SaaS companies in Europe
```

Result:

```text
SearchTask ID: cms2w6iv50002tsfwr9b4pizj
Provider: agent-reach
Status: COMPLETED
SearchTask.resultCount: 4
SearchTaskLead rows: 4
API results: 4
```

All four results included:

- real source URL
- `provider=agent-reach`
- `searchEngine=exa`
- raw source content or evidence
- SearchTask-specific ownership

### Search B — LinkedIn-targeted verification

Input:

```text
Find industrial automation SaaS companies in Europe
platforms: LinkedIn
region: Europe
```

Result:

```text
SearchTask ID: cms2w73ak000ttsfwm2y0i6c2
Provider: agent-reach
Status: COMPLETED
SearchTask.resultCount: 5
SearchTaskLead rows: 5
API results: 5
```

The results contained real LinkedIn profile URLs and Exa evidence.

## 6. Lead field verification

| Required field | Result |
| --- | --- |
| Company | Failed for this sample; values were null |
| Website/domain | Failed for this sample; values were null |
| Source evidence | Passed |
| SearchTask ownership | Passed |

The runtime is operational, but this search did not produce a sales-ready
verified company Lead.

Observed examples:

- Reddit community pages were saved as community/content evidence.
- One Reddit result contained network-block text.
- LinkedIn results were real profile URLs but were normalized as generic
  `LinkedIn source` or `Exa`, without verified company/domain fields.
- A YouTube procurement interview contained useful evidence but was not
  resolved to a verified company record.

No fake company, website, domain, or contact was generated to hide these
missing fields.

## 7. Configuration status

| Item | Status |
| --- | --- |
| mcporter executable | Ready |
| mcporter user config | Ready |
| Exa hosted MCP | Ready |
| Exa credentials | Not required for verified hosted mode |
| Backend mcporter path | Configured |
| Provider health gate | AVAILABLE |
| Real MCP search | Passed |
| SearchTask lifecycle | Passed |
| SearchTaskLead creation | Passed |
| Sales-ready Lead quality | Not passed |

## 8. Remaining blockers

### Runtime blockers

None for the currently verified hosted Exa MCP route.

### Non-blocking environment gap

The Agent Reach CLI is not installed, so `agent-reach doctor --json` cannot be
run. This does not block Sales Radar AI because the application calls mcporter
directly. Install the CLI only if its broader channel diagnostics and installer
features are required.

### Product/data-quality blocker

The current search strategy and extraction path do not reliably promote Exa
results into verified company Leads with website/domain data. The real search
runtime is restored, but the example search still fails the full sales-candidate
quality gate.

This should be handled in a later business-logic phase through:

1. company-focused search strategy;
2. company/domain verification;
3. content/evidence versus sales-candidate separation;
4. removal of blocked or generic content pages.

Those changes were intentionally not made in this runtime-only task.

