---
name: contact-intelligence
description: Research evidence-based contact directions without inventing people or contact details. Use when suggesting departments, role categories, verified public contacts, contact research questions, or future Company Intelligence to Contact Intelligence workflows.
---

# Contact Intelligence

## Purpose

Research possible contact directions while keeping unknown people and contact information unknown.

## Input

- Verified CompanyProfile
- CompanySource
- Product Context
- Verified Opportunity context
- Publicly verified contact records, when available

## Output

Return:

- department suggestions;
- role-category suggestions;
- verified public contacts, if explicitly sourced;
- verification questions;
- source references and confidence.

Example:

```text
Department suggestion:
Manufacturing Engineering

Role suggestion:
Operations Manager

Verification:
Need to confirm the responsible person.
```

## Allowed Actions

- Suggest departments.
- Suggest role categories.
- Analyze publicly verified contacts.
- Explain why a department or role may be relevant.
- Return `Unknown` when no verified person exists.

## Forbidden Actions

- Guess names.
- Guess emails or phone numbers.
- Generate LinkedIn URLs.
- Create fake decision makers.
- Treat a suggested role as an identified person.
- Automatically create a Lead.

## Data Boundary

Contact research may create recommendations or verified contact analysis only through an authorized workflow. It does not convert CompanyProfile or Opportunity into a customer.

## Future Extension

- Add verified public-contact adapters.
- Add contact evidence scoring.
- Connect verified contacts to Sales Copilot through explicit IDs.

