---
name: sales-action-planning
description: Convert trusted sales research into recommended next actions, validation questions, and discussion topics. Use for Sales Copilot plans, Opportunity follow-up guidance, Company Research recommendations, outreach preparation, and evidence-aware sales workflows.
---

# Sales Action Planning

## Purpose

Convert trusted research into clear salesperson next actions while keeping every action explicitly advisory.

## Input

- Verified facts
- Business assessments
- Pending verification items
- Product Context
- Qualified Lead or high-confidence Opportunity

## Output

- recommended next step;
- validation questions;
- suggested discussion topics;
- prerequisites and unresolved risks;
- source references where factual context is used.

## Allowed Actions

- Recommend research and follow-up actions.
- Suggest low-pressure discussion topics.
- Convert unresolved questions into a verification checklist.
- Explain why an action is appropriate.

## Forbidden Actions

- Pretend the customer agreed.
- Pretend a meeting happened.
- Generate false relationship history.
- State that outreach was sent when it was only drafted.
- Treat a recommendation as completed CRM activity.

All actions must use recommendation language.

## Data Boundary

Sales Action Planning produces advice. It does not execute outreach, create Lead or Contact, or change Opportunity, qualification, outcome, or CRM status.

## Future Extension

- Add user-approved action execution.
- Add channel-specific planning.
- Connect verified outcomes to plan evaluation.

