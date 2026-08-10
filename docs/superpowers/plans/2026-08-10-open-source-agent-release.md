# Sales Radar AI Open-Source and Agent Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Sales Radar AI under Apache-2.0 with professional community governance, honest product documentation and safe interfaces for coding and runtime agents.

**Architecture:** Repository-level instructions govern coding agents, while an authenticated OpenAPI contract governs runtime agents. Community files and GitHub configuration make contribution paths explicit; no product runtime or persistence logic changes.

**Tech Stack:** Markdown, OpenAPI 3.1 YAML, GitHub Issues/Discussions/Releases, npm package metadata.

## Global Constraints

- License all project-authored source under Apache-2.0.
- Preserve Evidence First and workspace ownership boundaries.
- Do not expose secrets or document unauthenticated production mutation paths.
- Do not modify SearchTask, Provider, Prisma, Opportunity, Lead Quality Gate or Revenue business logic.
- Do not claim unverified runtime capability, coverage, customers or revenue.

---

### Task 1: License and product documentation

**Files:**
- Create: `LICENSE`
- Create: `NOTICE`
- Create: `README.zh-CN.md`
- Create: `docs/assets/sales-radar-banner.svg`
- Modify: `README.md`
- Modify: `package.json`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: existing product architecture and verified test/deployment commands.
- Produces: public project entry points, license metadata and honest capability status.

- [ ] Add the official Apache License 2.0 text and project notice.
- [ ] Replace the corrupted README with an English public README and link to the Chinese edition.
- [ ] Add a branded, non-statistical SVG banner.
- [ ] Add Apache-2.0, repository and homepage metadata to both package manifests.
- [ ] Verify all commands and environment-variable names against the repository.

### Task 2: Agent-ready repository contract

**Files:**
- Modify: `AGENTS.md`
- Create: `.github/copilot-instructions.md`
- Create: `docs/AGENT_INTEGRATION.md`
- Create: `docs/openapi/agent-api.yaml`

**Interfaces:**
- Consumes: existing route/controller contracts and `.agent/SKILL_REGISTRY.md`.
- Produces: repository instructions for coding agents and an authenticated runtime-agent API contract.

- [ ] Define protected data and workflow boundaries in root agent instructions.
- [ ] Add concise GitHub Copilot repository instructions.
- [ ] Document coding-agent setup and runtime-agent use separately.
- [ ] Describe only API operations and fields supported by current controllers.
- [ ] Validate the OpenAPI file parses as YAML.

### Task 3: Contributor governance

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `SECURITY.md`
- Create: `docs/ROADMAP.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/ISSUE_TEMPLATE/provider_adapter.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

**Interfaces:**
- Consumes: project verification scripts and trust boundaries.
- Produces: clear paths for contribution, provider extensions and private security reports.

- [ ] Add contributor setup, change-scope and verification guidance.
- [ ] Add community conduct and private security reporting instructions.
- [ ] Publish an honest roadmap separating runtime validation from completed code.
- [ ] Add structured issue forms and a pull-request checklist.
- [ ] Validate YAML issue forms parse successfully.

### Task 4: Repository verification and GitHub publication

**Files:**
- Modify: repository metadata through GitHub API only.

**Interfaces:**
- Consumes: committed release files and passing repository checks.
- Produces: public metadata, Discussions, merged release branch and public-preview release.

- [ ] Run frontend typecheck, tests and build.
- [ ] Run backend Prisma validation, typecheck, tests and build.
- [ ] Run `git diff --check` and secret-pattern review.
- [ ] Commit and push the release documentation.
- [ ] Update GitHub description, homepage, topics, Discussions and private vulnerability reporting.
- [ ] Create a welcome Discussion.
- [ ] Mark pull request ready and wait for all checks.
- [ ] Merge to `main` and create the `v0.1.0` public-preview release.
