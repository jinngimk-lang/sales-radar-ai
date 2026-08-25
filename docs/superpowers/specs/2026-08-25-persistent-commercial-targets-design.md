# Persistent Commercial Targets Design

Date: 2026-08-25
Status: implementation slice after buyer/seller workspace Phase 1

## Goal

Give Sales Radar AI a persistent demand object analogous to a marketplace listing/position, so a user can save and switch among long-running commercial goals instead of rebuilding context on every visit.

## Truth boundary

A CommercialTarget is **user intent/configuration**, not market evidence. Creating a target never creates a MarketSignal, Opportunity, Lead, customer, contact, or revenue record.

## Model

```text
CommercialTarget
- id
- userId
- name
- product
- industry?            // research filter, free text for compatibility
- region?              // existing Region enum when known
- customerType?        // existing CustomerType enum when known
- goal                 // RadarCustomerGoal, excluding UNKNOWN at the API boundary
- signalFocus          // ALL or MarketSignalType string
- status               // DRAFT | ACTIVE | PAUSED | CLOSED
- lastRunAt?
- createdAt
- updatedAt
```

Multiple targets may be ACTIVE. `ACTIVE` means the user wants the target monitored/used, not that a buyer or opportunity exists.

## API

Mounted under the existing demo/auth workspace boundary:

- `GET /api/commercial-targets`
- `POST /api/commercial-targets`
- `PUT /api/commercial-targets/:id`

All operations are scoped by the current workspace user. Cross-user reads/updates must return not found.

Create requirements:

- `name`: 2..120 chars
- `product`: 2..200 chars
- `goal`: one of the six supported commercial goals
- `signalFocus`: `ALL` or a supported MarketSignalType
- optional enum filters must be valid when supplied

## Frontend

Add `/app/targets` as `目标` in primary navigation.

Targets page:

- compact creation form for name, product and commercial goal;
- persisted cards showing target status and filters;
- `去市场雷达` action opens `/app/market?targetId=<id>`;
- no invented recommendation counts.

Market page:

- reads `targetId` from the URL;
- fetches the exact user-scoped target;
- pre-fills the existing MarketScanTarget form;
- running a scan updates `lastRunAt` only after research completes successfully.

## Deployment safety

This slice requires a Prisma migration. It must not merge until the production deployment path is proven to run `prisma migrate deploy` (or an equivalent safe release command) before the new API is used. If current Railway configuration cannot prove that, keep the PR unmerged and add the smallest repository-owned deploy command/configuration needed.

## Rollback

The feature is additive. Removing the new route/navigation leaves existing Search, Market, Live and Revenue flows unchanged. The database table can remain unused during rollback; do not drop it automatically.
