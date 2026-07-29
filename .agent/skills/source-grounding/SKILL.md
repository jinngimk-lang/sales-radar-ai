---
name: source-grounding
description: Guarantee that factual Sales Radar AI statements are grounded in verified, explicitly related sources. Use when creating or reviewing facts, source mappings, Research Trace, Company Intelligence, Market Intelligence, Opportunity explanations, or other evidence-backed sales research output.
---

# Source Grounding

## Purpose

Guarantee every factual statement is grounded in a verified source and remains traceable to that source.

## Input

- `SearchEvidence`
- `CompanySource`
- `MarketSignal` only when an explicit persisted relationship exists
- Explicit entity IDs and source relationships

## Output

For every `FACT`, return:

- source ID;
- source type;
- captured time;
- relationship explanation;
- verification status.

Return `NEEDS_REVIEW` when evidence is missing, weak, conflicting, or not explicitly related.

## Allowed Actions

- Follow explicit persisted IDs and relationships.
- Verify that a source supports the exact factual claim.
- Separate source content from business interpretation.
- Report unsupported and conflicting claims.

## Forbidden Actions

- Use search keywords as evidence.
- Establish relationships using company-name similarity.
- Establish relationships using URL similarity.
- Guess a domain or official website.
- Use general industry knowledge as a company fact.
- Create missing facts through AI inference.

Never convert:

```text
Company expanded its factory
```

into:

```text
Company purchased an automation system
```

Never convert:

```text
Company uses a technology
```

into:

```text
Company wants our product
```

## Data Boundary

Source Grounding validates support for existing claims. It does not create Opportunity, Lead, Contact, CompanyProfile, or CRM truth.

## Future Extension

- Add source corroboration and contradiction checks.
- Add freshness and source-authority policies.
- Add claim-level grounding evaluation.

