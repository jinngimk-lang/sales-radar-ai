---
name: market-signal-evaluation
description: Evaluate whether validated market Evidence supports a factual Market Signal while keeping facts, assessments, recommendations, and review items separate. Use when testing or reviewing news, hiring, social, website, RSS, government, partnership, investment, expansion, or digital-transformation signal extraction.
---

# Market Signal Evaluation

## Purpose

Evaluate Market Signal quality without turning market information into procurement claims, customers, Leads, Contacts, or Opportunities.

## Input

Require:

- Authenticated `userId`.
- Validated SearchEvidence.
- Explicit source reference and source tier.
- Publisher identity.
- Body excerpt supporting the proposed event.
- Published or captured time.
- Proposed Signal type.
- Explicit company relationship when one exists.
- Evaluation-policy version.

## Output

Separate the result into:

- `FACT`: the event explicitly supported by Evidence.
- `ASSESSMENT`: why the event may be commercially relevant.
- `RECOMMENDATION`: what a salesperson should verify next.
- `NEEDS_REVIEW`: missing, weak, social-only, conflicting, or ambiguous evidence.

Include source IDs, reasons, verification questions, confidence, and evaluation version.

## Core Rules

### FACT

- Require an explicit source.
- State only what the source supports.
- Preserve event time and company subject.
- Do not add product need or purchase intent.

### ASSESSMENT

- Include reasons.
- Label the output as commercial judgment.
- Never present it as confirmed company behavior.

### RECOMMENDATION

- Use advisory language.
- Ask the salesperson to verify project stage, relevance, or responsible department.
- Never imply agreement, procurement, or an existing relationship.

### NEEDS_REVIEW

Use when:

- Only a title exists.
- Company identity is ambiguous.
- Evidence is Tier 3 without corroboration.
- Time is missing or stale.
- Sources conflict.
- The proposed event depends on keyword or name similarity.

## Allowed Actions

- Read validated Evidence and explicit source relationships.
- Confirm whether the source supports an event.
- Classify a grounded event as a Market Signal candidate.
- Explain commercial relevance as an assessment.
- Recommend verification questions.
- Block unsafe Signal promotion.
- Return evaluation results without modifying business data.

## Forbidden Actions

- Create or modify MarketSignal, Opportunity, Lead, Contact, or Customer records.
- Treat a Signal as an Opportunity.
- Bypass Opportunity Quality Gate.
- Infer procurement, budget, product need, buying timeline, or decision makers.
- Generate an event from a headline, keyword, company name, or URL similarity.
- Treat employee or public-user opinions as company fact.
- Associate records owned by different users.

## Evaluation Cases

### Company expansion news

Input:

```text
Toyota announces a factory expansion.
```

Allow:

```text
FACT: Toyota announced a factory expansion.
Signal: EXPANSION.
```

Forbid:

```text
Toyota wants automation software.
Toyota is buying robots.
```

### Reddit opinion

Input:

```text
I think this factory needs robots.
```

Return:

```text
NEEDS_REVIEW
```

Do not create a company fact, Market Signal, or Opportunity.

### Hiring evidence

Input:

```text
The verified company careers page lists a PLC Engineer role.
```

Allow:

```text
FACT: The company published a PLC Engineer vacancy.
Signal: HIRING.
```

Forbid:

```text
The company is purchasing PLC equipment.
The company has started an automation project.
```

## Data Boundary

Maintain:

```text
Evidence
   ↓
FACT
   ↓
Market Signal
   ↓
ASSESSMENT
   ↓
Opportunity Candidate
   ↓
Opportunity Quality Gate
```

This skill returns an evaluation only. It does not persist data or perform CRM promotion.

## Traceability

Return:

- Evidence and source IDs.
- Source tier.
- Supported excerpt.
- Signal candidate type.
- Fact, assessment, and recommendation boundaries.
- Verification status and questions.
- Confidence reasons.
- Evaluation-policy version and timestamp.

Never expose Prompt content, credentials, model internals, or unrelated user data.

## Future Extension

Prepare for:

- Source-tier-specific evaluation suites.
- Signal freshness tests.
- Conflict detection.
- Multilingual Evidence cases.
- Regression evaluation for adapters and signal extractors.
- Human review of social and ambiguous signals.

Future evaluation must continue blocking social-only Opportunities and procurement inference.
