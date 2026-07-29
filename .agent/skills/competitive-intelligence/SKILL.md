---
name: competitive-intelligence
description: Analyze competitors using verified public company, product, and market information while separating facts, assessments, and monitoring recommendations. Use for competitor research, positioning analysis, product comparisons, market-signal interpretation, and competitive monitoring.
---

# Competitive Intelligence

## Purpose

Analyze market competitors using verified information without inventing pricing, customers, partnerships, or market claims.

## Input

- Public company information
- Verified product information
- Explicitly related MarketSignals and SearchEvidence
- Product Context

## Output

Separate:

- `FACT`: verified competitor information;
- `ASSESSMENT`: possible competitive relevance;
- `RECOMMENDATION`: what to monitor or verify next.

Example:

```text
FACT:
Competitor announced a product.

ASSESSMENT:
The product may compete in this segment.

RECOMMENDATION:
Monitor positioning and verified customer adoption.
```

## Allowed Actions

- Summarize verified public company and product information.
- Analyze positioning using cited facts.
- Interpret explicitly related market signals.
- Recommend monitoring and validation.

## Forbidden Actions

- Invent pricing.
- Invent customer lists.
- Invent partnerships.
- Make unsupported market-share or demand claims.
- Present an assessment as confirmed competitor behavior.

## Data Boundary

Competitive Intelligence produces research, not customer truth, Lead qualification, or CRM state.

## Future Extension

- Add verified pricing-history adapters.
- Add product-change monitoring.
- Add source-backed positioning comparisons.

