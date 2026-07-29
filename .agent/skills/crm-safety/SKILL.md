---
name: crm-safety
description: Protect Sales Radar AI CRM data quality and promotion boundaries. Use when creating or updating Leads, Contacts, qualification status, customer status, outcomes, CRM records, or any workflow that could promote research data into customer truth.
---

# CRM Safety

## Purpose

Protect CRM data quality by preventing research evidence, opportunities, and AI output from becoming customer truth without verification and user control.

## Input

- Proposed CRM mutation
- Verified Evidence
- Qualification result and version
- Current authenticated user
- User confirmation

## Output

- Allow or reject decision
- Missing requirements
- Required quality gate
- Required user action
- Audit reason

## Core Rules

```text
CompanyProfile != Customer
Opportunity != Qualified Lead
Evidence != Purchase confirmation
```

AI output cannot directly:

- create a Lead;
- create a Contact;
- change qualification;
- change customer status.

Any CRM promotion requires:

- verified evidence;
- the applicable quality gate;
- current-user ownership;
- explicit user action.

## Allowed Actions

- Validate a proposed CRM mutation.
- Require authentication, ownership, evidence, and qualification.
- Reject unsupported promotion.
- Explain what must be confirmed by the user.

## Forbidden Actions

- Bypass Lead Quality Gate.
- Promote Opportunity to Lead automatically.
- Treat AI confidence as qualification.
- Create customer state from recommendations.
- Change CRM status without explicit authorization.

## Data Boundary

CRM Safety is a guardrail. It validates mutations but does not generate evidence, Opportunity, CompanyProfile, Lead, or Contact.

## Future Extension

- Add policy versions and audit events.
- Add role-based mutation permissions.
- Add reversible quarantine and review workflows.

