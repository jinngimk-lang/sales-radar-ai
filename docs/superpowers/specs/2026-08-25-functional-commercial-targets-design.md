# Functional Commercial Targets Design

## Goal

Make the Targets workspace a real control surface for reusable commercial intent, not a decorative configuration page. Every retained control must either persist backend state or launch a workflow that consumes that state.

## Current problem

The backend already stores `industry`, `region`, `customerType`, `goal`, and `signalFocus`, and Market/Search can consume target context. The Targets page only exposes `name`, `product`, and `goal` at creation time, so saved cards can say that industry/region/customer type are unspecified even though those fields are first-class system inputs. Cards cannot edit the actual target, and the page exposes status controls whose operational meaning is weak when no scheduler or recommendation filter consumes them directly.

## Product rules

1. A target is a reusable commercial-intent record, not an opportunity or lead.
2. Creation and editing expose the fields actually consumed by Market/Search:
   - name
   - product/service
   - commercial goal
   - industry
   - region
   - customer type
   - signal focus
3. The saved target can launch both Market Radar and Search with `targetId`; those pages remain responsible for executing their own real workflows.
4. Editing writes through the existing commercial-target API and immediately updates the card.
5. Status is kept only where it has a clear meaning to the operator. In this release `ACTIVE` / `PAUSED` remain as an operator-level enable/disable flag, but the UI copy must not imply background automation. `CLOSED` is read-only/archival.
6. Do not add fake run counters, scheduled scans, or recommendation statistics without backend evidence.
7. `lastRunAt` remains the only run indicator and is updated only by a successful target-linked market research run.

## UI

### Create form

Use a compact two-row form. Required fields: target name, product/service, commercial goal. Optional structured fields: industry, region, customer type, signal focus. Disable submit until required fields are valid.

### Saved target card

Show only operationally meaningful information:

- goal and status;
- name and product;
- explicit structured constraints;
- last successful target-linked research time;
- actions: `编辑`, `暂停/启用`, `去搜索`, `去市场雷达`.

Remove decorative target icons or duplicate summary text where they do not aid action.

### Edit interaction

Use inline editing inside the card rather than a second page. Save writes the complete changed target through `PUT /commercial-targets/:id`; cancel discards local changes.

## Data flow

```text
Targets page
  -> create/update CommercialTarget API
  -> persisted structured target
  -> /app/discover?targetId=...
  -> /app/market?targetId=...
  -> those workspaces restore target fields and create their own SearchTask / market research execution
```

The Targets page itself does not manufacture search results or market signals.

## Validation

- name: trimmed length >= 2, max 120;
- product: trimmed length >= 2, max 200;
- goal must be a supported commercial goal;
- region/customer type use existing enum values;
- signal focus uses existing market-intelligence values;
- blank optional values persist as `null`.

## Testing

Frontend contract tests must prove:

- create sends all structured target fields to the backend service;
- edit persists changed structured fields;
- Search and Market links include the same target ID;
- the UI does not claim automatic/background execution;
- last-run copy is only based on `lastRunAt`.

Backend contract tests continue to cover field validation and successful-run recording; add tests only if a gap is found while implementing the UI.

## Rollback

The change uses the existing CommercialTarget API/schema. Rolling back the UI does not require a database rollback.