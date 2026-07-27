# Sales Radar AI — Exa MCP Setup Guide

## 1. Recommended runtime mode

Sales Radar AI currently uses:

```text
AgentReachProvider
  -> mcporter
  -> Exa hosted MCP
  -> https://mcp.exa.ai/mcp
```

The hosted Exa MCP endpoint is the recommended mode for this project. It does
not require a local Exa MCP package and was verified without an API key.

Official references:

- Agent Reach installation guide:
  `https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md`
- Exa MCP server:
  `https://github.com/exa-labs/exa-mcp-server`

## 2. Accounts and credentials

### Hosted MCP mode

- Exa account: not required for the currently verified hosted endpoint.
- `EXA_API_KEY`: not required.
- OAuth login: not required.

### API-key/local MCP mode

Use this only if the hosted endpoint later requires authentication, higher
limits, or a private Exa account.

- Create an Exa account at `https://dashboard.exa.ai`.
- Create an API key in the Exa dashboard.
- Store the key as `EXA_API_KEY`.
- Never commit the key to Git or put it in frontend environment variables.

No API key was invented or written during this verification.

## 3. Windows prerequisites

Required executables:

```powershell
node --version
npm --version
mcporter --version
```

Expected PATH entries:

```text
C:\Program Files\nodejs
C:\Users\<user>\AppData\Roaming\npm
```

The project backend must be launched from an environment where `node.exe` is
available on PATH because `mcporter.cmd` invokes Node.

## 4. Install mcporter

If it is missing:

```powershell
npm install -g mcporter
```

Verify:

```powershell
mcporter --version
```

The verified version for this project is `0.12.3`.

## 5. Register Exa MCP

Persist the hosted endpoint in the user-level mcporter config:

```powershell
mcporter config add exa https://mcp.exa.ai/mcp --scope home
```

This writes:

```text
C:\Users\<user>\.mcporter\mcporter.json
```

Expected configuration:

```json
{
  "mcpServers": {
    "exa": {
      "baseUrl": "https://mcp.exa.ai/mcp"
    }
  }
}
```

Inspect without exposing credentials:

```powershell
mcporter config get exa --json
mcporter list exa --schema --json
```

Expected status:

```json
{
  "name": "exa",
  "status": "ok"
}
```

Expected tools include:

- `web_search_exa`
- `web_fetch_exa`

## 6. Backend environment

Recommended `backend/.env` entries:

```dotenv
AGENT_REACH_MCPORTER_PATH=C:\Users\<user>\AppData\Roaming\npm\mcporter.cmd
AGENT_REACH_TIMEOUT_MS=30000
AGENT_REACH_MAX_RESULTS=5
```

Optional local/API-key mode only:

```dotenv
EXA_API_KEY=
```

Do not put a real key in `.env.example`, frontend variables, logs, or source
control.

## 7. Verification commands

### Runtime discovery

```powershell
mcporter list --json
```

The `exa` entry must be `ok`. Other imported MCP servers may be offline without
affecting Exa.

### Direct real search

PowerShell:

```powershell
mcporter call "exa.web_search_exa(query: 'Find industrial automation SaaS companies in Europe', numResults: 5)"
```

The complete tool call must be passed as one argument.

### Application health

With the backend running on port 8787:

```powershell
Invoke-RestMethod http://localhost:8787/api/search/providers/health
```

Expected:

```json
{
  "data": {
    "provider": "agent-reach",
    "dependency": "exa",
    "state": "AVAILABLE",
    "code": "OK"
  }
}
```

### Application search

```powershell
$body = @{
  keyword = "Find industrial automation SaaS companies in Europe"
  platforms = @()
  regions = @("Europe")
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri http://localhost:8787/api/search-task `
  -Method Post `
  -ContentType application/json `
  -Body $body
```

Poll `GET /api/search-task/:id`, then read only:

```text
GET /api/search-task/:id/results
```

## 8. Troubleshooting

### `EXA_NOT_CONFIGURED`

Run:

```powershell
mcporter config add exa https://mcp.exa.ai/mcp --scope home
mcporter list exa --schema --json
```

### `mcporter.cmd` cannot find Node

Confirm `C:\Program Files\nodejs` is on PATH, then restart the terminal and
backend process.

### mcporter says Exa is `ok`, but the application does not

Restart the backend so it reloads the current environment and code. Then call
the health endpoint again.

### Search succeeds but company/domain fields are empty

This is not an Exa runtime failure. It means the returned evidence could not be
promoted into a verified company Lead by the current extraction and quality
rules. Do not fill missing fields with invented values.

