---
name: opportunity-quality
description: Guard Sales Radar AI Opportunity generation quality by checking company identity, real sources, explicit business-change events, timing, Product Context relevance, and safe commercial wording. Use when evaluating a proposed Opportunity before it is stored, displayed, or passed to later research.
---

# Opportunity Quality

## Purpose

Act as the quality gate for proposed Sales Radar AI Opportunities. Evaluate whether a source-grounded business change is sufficiently clear and relevant to be presented as a sales opportunity without converting it into procurement fact or customer truth.

## Input

Inspect:

- Authenticated `userId`.
- Proposed Opportunity payload.
- Explicit company or business-subject identity.
- SearchEvidence and source references.
- Event description and event type.
- Event time, announcement time, or explicit project stage.
- ProductContextSnapshot.
- Opportunity reasoning and confidence.

Treat Product Context as relevance background, not as evidence of company behavior.

## Output

Return one quality decision:

- `QUALITY_PASS`: all required conditions are explicitly supported.
- `QUALITY_WARNING`: the event may be commercially useful but one or more non-critical details require verification.
- `QUALITY_BLOCK`: a required condition is absent, unsupported, cross-user, or violates the trust boundary.

Include:

- Rule-by-rule results.
- Source references.
- Warning or blocking reasons.
- Pending verification questions.
- A clear statement that the result is a commercial assessment, not procurement confirmation.

## Core Rules

An Opportunity must have:

1. An explicit company or business subject.
2. At least one real, traceable source.
3. An explicit change event, such as investment, expansion, or digital upgrade.
4. Event time, announcement time, or explicit stage information.
5. A reasoned relationship to Product Context.
6. Commercial-opportunity wording only; never procurement-fact wording without explicit procurement evidence.

Apply Evidence First:

```text
Source
  ↓
Evidence
  ↓
Business-change fact
  ↓
Commercial assessment
  ↓
Recommended verification
```

## Allowed Actions

- Read the proposed Opportunity, Product Context, and explicitly related evidence.
- Verify user ownership and explicit entity relationships.
- Confirm the presence of a real URL and source metadata.
- Check whether the evidence describes a concrete business change.
- Check timing or stage information.
- Evaluate and explain Product Context relevance.
- Return a pass, warning, or block decision.
- Recommend what a salesperson should verify next.

## Forbidden Actions

- Modify Opportunity or any other business record.
- Create a Lead, Contact, Customer, Opportunity, or source relationship.
- Generate an Opportunity from ordinary industry information.
- Generate an Opportunity from a static company introduction.
- Guess procurement demand, purchase intent, budget, supplier search, or decision makers.
- Generate an Opportunity without a real source.
- Treat Product Context as proof of company action.
- Link evidence by keyword, company-name, domain, or URL similarity alone.
- Associate entities owned by different users.
- Bypass Evidence Validation, Opportunity Detection, Lead Quality Gate, or Qualification Version.

## Data Boundary

Operate as a read-only check:

```text
Proposed Opportunity + explicit evidence + Product Context
                            ↓
                  Opportunity quality check
                            ↓
          QUALITY_PASS | QUALITY_WARNING | QUALITY_BLOCK
```

Do not persist the result unless a separately approved caller records quality metadata. Do not change the Opportunity generation rules or promote an Opportunity into a Qualified Lead.

## Traceability

For every quality decision, include:

- Quality-policy version.
- Authenticated user context.
- Opportunity or proposal identifier.
- Source and evidence identifiers.
- Event fact being evaluated.
- Event time or stage reference.
- Product Context reference.
- Rule outcomes and reasons.
- Verification questions.
- Evaluation timestamp.

Never expose prompts, API keys, model internals, or unrelated user data.

## Future Extension

Future versions may add:

- Versioned event-quality policies.
- Event-type-specific validation rules.
- Source reliability tiers.
- Time-decay and freshness checks.
- Human review queues for `QUALITY_WARNING`.
- Regression evaluations for Opportunity Detection changes.

All extensions must preserve Evidence First, user isolation, Opportunity and Lead separation, and the prohibition against presenting assessment as procurement fact.
