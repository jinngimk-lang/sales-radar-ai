# Exa MCP 3.2.1 transitive ShellJS security finding

Date: 2026-08-28
Status: mitigation candidate under isolated PR validation

## Evidence

Production currently pins `exa-mcp-server@3.2.1` in `backend/Dockerfile` and executes the local stdio MCP process through mcporter. The published `exa-mcp-server@3.2.1` package metadata includes `whoami@^0.0.3`. `whoami@0.0.3` resolves `shelljs@0.3.0` in the affected dependency chain.

GitHub Reviewed advisory `GHSA-4rq4-32rv-6wp6` / `CVE-2022-0144` classifies `shelljs <0.8.5` as HIGH severity Improper Privilege Management; `GHSA-64g7-mvw6-v9qj` covers the related moderate issue. Exa upstream issue #407 documents the same `whoami -> shelljs@0.3.0` chain in Exa MCP 3.4.0. Current upstream `3.4.1` no longer declares `whoami`, but it also changes the package/build/tool surface and is not a drop-in production upgrade without regression evidence.

## Decision

Do not jump the production runtime from Exa MCP 3.2.1 to 3.4.1 solely to clear the advisory. Preserve the proven 3.2.1 tool contract while testing a narrow npm override to `shelljs@0.8.5` in an isolated package prefix. The runtime image must prove that the vulnerable `shelljs@0.3.0` is absent and the `exa-mcp-server` binary remains executable.

A future Exa MCP upgrade remains separately gated by tool-list, SearchTask, provider-failure, provenance and production smoke regression coverage.

## Rollback

Revert the isolated runtime-prefix/override change and restore the previous global Exa MCP installation if Docker/runtime validation fails. Do not weaken SearchEvidence or provider failure semantics to force an upgrade.
