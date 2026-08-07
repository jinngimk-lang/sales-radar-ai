# Result Table → Detail Drill-down Design

## Goal

Change AI command-center search results from card-first browsing to a wide-to-narrow workflow: users first scan a dense table, then focus on one selected entity in a detail card.

## Approved interaction

The user's requested direction is authoritative: **table first, detail card after click**. No additional approval gate is required for implementation.

## Overview state

- Render all current-task `ChatSession` results in a compact table instead of a grid of full cards.
- Keep the current result count and evidence-backed wording.
- Default sort by `assistantScores.overall` descending; sessions without scores sort after scored sessions. Use contact count as the secondary descending tie-breaker.
- Show enough rows per viewport to support broad scanning.
- Do not invent scores. Missing values render as `—` / `未评分`.

## Table columns

1. Object: customer/display name, job title/company, platform.
2. Potential: existing `assistantScores.overall`, converted only for display to `高潜 / 中潜 / 低潜`; this is not a new model prediction.
3. Intent: existing `assistantScores.intent`.
4. Identity: existing `assistantScores.identity`.
5. Evidence: existing `assistantScores.evidence`.
6. Contact: existing `assistantScores.contact` plus observed contact count.
7. Source: source availability / source link indicator.
8. Action: `查看详情`.

Each score is represented by a compact colored dot/badge plus the numeric value. Color is a visual severity/strength encoding of the existing score only.

## Focus state

- Before selection, the table uses the full available width.
- Selecting a row changes desktop layout to master-detail: the table remains visible on the left and the existing `EntityIntelligenceCard` appears in a scrollable sticky inspector on the right.
- The selected row is visibly highlighted and exposes `aria-selected`.
- The inspector has a clear close action that restores the full-width table.
- On small screens, the detail card appears below the table rather than forcing a narrow split.
- The existing detail card remains the source of truth for contacts, evidence, source links, content signals, and suggested action.

## Score display rules

- `>= 75`: strong / high potential visual treatment.
- `50–74`: medium potential visual treatment.
- `< 50`: low potential visual treatment.
- Missing/non-finite score: neutral `—` treatment.
- Labels are `综合/潜力`, `意向`, `身份`, `证据`, `联系人`; no inferred purchase probability is introduced.

## Accessibility and navigation

- Rows are keyboard-focusable buttons/interactive rows and support Enter/Space selection.
- `aria-selected` communicates the current row.
- Detail close control has an explicit accessible label.
- Links inside rows stop propagation so opening a source does not unexpectedly select/close a row.

## Error and empty states

Existing loading and empty states remain unchanged. A session with partial data still appears in the table with unknown fields explicitly rendered as unknown rather than being filtered out.

## Testing

- Unit-test sorting and potential-label mapping as pure helpers.
- Source-contract test verifies table-first rendering, row selection state, score badges, and a single detail-card inspector rather than mapping full cards for all rows.
- Run frontend typecheck, tests, and production build.
- Run full repository CI before merge and verify Vercel deployment after merge.
