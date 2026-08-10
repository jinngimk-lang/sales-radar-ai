# Sales Radar AI Open-Source and Agent Release Design

## Goal

Publish Sales Radar AI under Apache-2.0 as a trustworthy, developer-friendly and agent-ready open-source project without weakening its evidence, workspace ownership or sales-quality boundaries.

## Audience

- Sales intelligence builders evaluating or extending the product.
- Developers integrating search, crawling, agent runtime or CRM adapters.
- Coding agents such as Codex, GitHub Copilot and Claude Code working in the repository.
- Runtime agents invoking documented, authenticated Sales Radar API workflows.

## Release shape

The public repository will contain:

1. Apache-2.0 licensing and standard community governance.
2. An English primary README and a Chinese companion README.
3. A concise product story based on the real evidence-first workflow.
4. Repository instructions for coding agents and GitHub Copilot.
5. A runtime-agent integration guide and a machine-readable OpenAPI contract.
6. Issue, pull-request, security and conduct workflows for outside contributors.
7. GitHub metadata, Discussions and a first public-preview release.

## Product promise

The public positioning is:

> Turn public market changes into evidence-backed sales opportunities.

The repository must never claim unsupported coverage, customer counts, provider availability or revenue outcomes. Capability status is separated into implemented code, deployment configuration and runtime validation.

## Agent model

### Coding agents

Coding agents start at `AGENTS.md`, then read `CONTEXT.md`, `.agent/SKILL_REGISTRY.md` and only the domain skills relevant to the task. They must preserve the truth hierarchy:

```text
Source -> Evidence -> Fact -> Assessment -> Recommendation
```

### Runtime agents

Runtime agents use authenticated HTTP APIs described by `docs/openapi/agent-api.yaml`. They may create search tasks, read evidence-backed results, inspect Radar assessments and request sales-assistance output. They may not bypass workspace isolation, create customer facts or promote evidence directly into CRM truth.

### Reusable project skills

The `.agent/skills` directory remains the canonical, versioned set of project-specific guardrails. The public docs explain how any agent runner can load them as repository instructions without claiming universal compatibility with every vendor-specific plugin format.

## GitHub community design

- Issues use structured bug, capability and provider-adapter forms.
- Pull requests include evidence, boundary and verification checklists.
- Security reports use GitHub private vulnerability reporting.
- Discussions provide a welcome thread for users, integrators and contributors.
- The first release is a public preview and states runtime limitations honestly.

## Release boundary

This release changes documentation, repository metadata and package metadata only. It does not change SearchTask, providers, scoring, Opportunity, Lead Quality Gate, Revenue workflows, Prisma models or API behavior.
