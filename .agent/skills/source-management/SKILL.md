---
name: source-management
description: Govern the Sales Radar AI market Source Registry lifecycle, including source identity, type, tier, ownership, permissions, status, and health. Use when registering, reviewing, enabling, pausing, disabling, or diagnosing company websites, RSS feeds, careers pages, news media, government sources, social platforms, or job platforms without fetching content or generating business conclusions.
---

# Source Management

## Purpose

Manage the lifecycle and governance of every Market Intelligence data source.

Treat a Source as a publisher or data entry point. Do not fetch content, validate Evidence, extract Market Signals, or make commercial judgments.

## Input

Require:

- Authenticated `userId`.
- Source registry ID when updating an existing source.
- Source name and canonical entry URL.
- Source type.
- Source tier.
- Ownership or publisher-verification status.
- Allowed access method.
- Permission and credential-reference metadata.
- Current status and health observations.
- Registry-policy version.

Never accept a raw credential, API key, cookie, or password as Source metadata.

## Output

Return a Source Registry lifecycle result:

- Source identity and registry ID.
- Source type and tier.
- Ownership boundary.
- Verification requirement.
- Current lifecycle status.
- Health summary.
- Allowed access method.
- Required review actions.
- Status-change reasons.
- Registry and policy versions.

Do not return Evidence, facts, Market Signals, Opportunities, customers, Leads, or Contacts.

## Source Types

Use only:

```text
COMPANY_WEBSITE
RSS
CAREERS
NEWS_MEDIA
GOVERNMENT
SOCIAL
JOB_PLATFORM
```

The type describes how the source is governed. It does not establish the truth of any content published by that source.

## Source Tiers

### TIER_1

Use for verified first-party or authoritative publishers:

- Verified company website or newsroom.
- Verified company careers page.
- Investor-relations page.
- Government or regulatory publisher.

### TIER_2

Use for professional secondary publishers:

- Industry media.
- News media.
- Industry association.
- Trade-show organizer.

### TIER_3

Use for social, community, employee, public-user, or otherwise weakly controlled sources:

- LinkedIn.
- X.
- Reddit.
- YouTube.
- Community forums.
- Public job or discussion platforms without first-party verification.

Tier is a source-governance input, not Evidence confidence and not proof that a claim is true.

## Source Status

Use:

```text
ACTIVE
PAUSED
FAILED
DISABLED
NEEDS_REVIEW
```

Rules:

- `ACTIVE`: source identity, permission, and current health allow ingestion.
- `PAUSED`: temporarily stop ingestion without removing registry history.
- `FAILED`: repeated technical failures prevent normal operation.
- `DISABLED`: explicitly prohibited or retired; do not schedule ingestion.
- `NEEDS_REVIEW`: identity, permission, ownership, or configuration is incomplete.

Never delete history merely because a Source changes status.

## Source Health

Track:

- Last successful time.
- Last failed time.
- Consecutive failure count.
- Most recent HTTP status.
- Rate-limit state and retry-after time.
- Last health-check time.
- Health-check version.
- Last failure category.

Suggested health states:

```text
HEALTHY
DEGRADED
UNAVAILABLE
UNKNOWN
```

Health confirms technical accessibility only. Successful fetching does not prove that the content is factual.

## Allowed Actions

- Register a proposed source under the authenticated user.
- Classify source type and tier from explicit publisher information.
- Verify that the source belongs to the same user boundary as its registry record.
- Record allowed access methods and credential references.
- Activate, pause, disable, or flag a source for review under an explicit policy.
- Record health results and failure counters.
- Recommend retry, review, pause, or disable actions.
- Preserve status and health history.
- Return a lifecycle or governance decision.

Only perform registry mutations through a future authorized Source Registry service. This Skill does not itself fetch external data.

## Forbidden Actions

- Fetch, crawl, parse, or monitor source content.
- Create SearchEvidence, facts, Market Signals, Opportunities, Leads, Contacts, Qualified Leads, or Customers.
- Generate a customer from a Source name.
- Confirm a company from a domain alone.
- Treat successful fetching as proof that content is true.
- Infer company relationships from a social account.
- Infer procurement, product need, decision makers, or commercial intent.
- Promote a Source because it produces more results.
- Store or expose raw secrets.
- Link sources or entities across users.
- Bypass robots rules, platform terms, permissions, or access controls.

## Data Boundary

Keep the control plane distinct from the data plane:

```text
Source Management
    ↓
Source Registry lifecycle and health only

Data Adapter
    ↓
Raw content acquisition

Evidence Validation
    ↓
Verified research evidence

Market Signal
    ↓
Explicit change event

Opportunity
    ↓
Commercial assessment
```

Maintain:

```text
Source != Evidence
Evidence != Fact
Fact != Opportunity
Opportunity != Customer
```

## Relationship to Existing Systems

- **Search Provider** discovers information and candidate URLs.
- **Data Source** publishes information or provides a governed entry point.
- **Source Registry** governs source identity, access, tier, status, and health.
- **Evidence** validates information captured from a source.
- **Market Signal** describes a source-grounded change event.
- **Opportunity** expresses a separate commercial-value assessment.

Exa, AgentReach, Google, Bing, or Baidu may discover a URL. The final publisher remains the Data Source.

## Traceability

Record:

- Authenticated user context.
- Source registry ID.
- Canonical source URL.
- Source type and tier.
- Ownership-verification state.
- Status before and after a lifecycle action.
- Status-change reason.
- Health result and failure category.
- Allowed access method.
- Registry-policy and health-check versions.
- Actor and evaluation timestamp.

Do not expose credentials, API keys, session data, Prompt content, or unrelated user records.

## Future Extension

Prepare for:

- Source Registry API and administrative UI.
- Scheduler policies by source type and tier.
- Credential-vault references.
- Robots and terms-of-service policy checks.
- Source-level rate budgets.
- Circuit breakers and retry windows.
- Reliability history and freshness monitoring.
- Shared public-source catalogs with strict tenant isolation.
- Source approval workflows.
- Platform-specific adapters that remain outside this Skill.

Future extensions must keep source governance separate from ingestion, Evidence validation, Market Signal extraction, Opportunity analysis, and CRM entities.
