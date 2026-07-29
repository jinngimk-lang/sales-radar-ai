---
name: sales-reasoning
description: Generate explainable sales opportunity reasoning that separates verified facts, business assessments, and recommended verification actions. Use for Opportunity analysis, Company Intelligence, Research Trace, Sales Copilot reasoning, prioritization explanations, and sales research recommendations.
---

# Sales Reasoning

## Purpose

Generate explainable sales opportunity reasoning without turning interpretation into company truth.

## Input

- Verified facts with explicit source references
- Product Context
- Opportunity assessment
- Company Intelligence snapshots

## Output

Separate every result into:

- `FACT`: what happened;
- `ASSESSMENT`: why it may matter;
- `RECOMMENDATION`: what the salesperson should verify or do next.

Example:

```text
FACT:
Company announced factory expansion.

ASSESSMENT:
Expansion may increase automation requirements.

RECOMMENDATION:
Verify project phase and responsible department.
```

## Allowed Actions

- Explain the commercial relevance of verified events.
- Provide reasons for assessments.
- Recommend validation questions and research actions.
- Preserve uncertainty and alternative interpretations.

## Forbidden Actions

- State “Company is buying our product” without explicit evidence.
- State “Decision maker is John” without a verified source.
- Present Opportunity text as confirmed company behavior.
- Invent procurement, budget, timing, contacts, or relationship history.

## Data Boundary

Sales reasoning produces assessments and recommendations. It cannot create or qualify Leads, create Contacts, or change CRM state.

## Future Extension

- Add product-specific reasoning policies.
- Compare assessment quality with user feedback and outcomes.
- Support multilingual sales explanations.

