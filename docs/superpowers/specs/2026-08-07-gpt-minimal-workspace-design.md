# GPT-style Minimal Workspace Design

## Goal
Unify the four primary workspaces into a calm, GPT-like product surface: minimal copy, one obvious primary action, progressive disclosure, and consistent spacing, width, borders, typography, and status treatment.

## Design principles
- Input and task state come first; explanatory copy stays secondary.
- Default views should be visually quiet. Dense details appear only after a task starts or a user drills into a result.
- Keep one shared visual grammar across AI Home, Market Radar, Revenue, Settings, and the left navigation.
- Prefer white/very-light gray surfaces, 1px neutral borders, low shadow, 20-24px radii, and restrained blue accents.
- No large marketing-style capability cards inside the authenticated workspace.
- No persistent policy/guardrail prose where a compact state or icon can communicate the same thing.
- Preserve all existing functional and safety behavior; this is an information-architecture and presentation change.

## AI Home
Idle state becomes a single centered composition:
- short title: `今天要研究什么？`
- one CommandComposer
- up to three small starter chips, not full cards
- compact runtime status in the header only

Remove the large icon, uppercase product slogan, long explanation paragraph, four capability cards, three example cards, and the footer disclaimer under the composer. After activity begins, keep the existing on-demand Agent behavior and structured result workspace.

## Shared page shell
Market, Revenue, and Settings use the same `WorkspaceHeader` pattern:
- title only or title + one short sentence
- optional compact action/status on the right
- max content width around 1180px
- consistent 24-32px vertical rhythm

Panels use the same surface class: white background, neutral border, subtle/near-zero shadow, 20-24px radius. Avoid nested card-on-card decoration unless it communicates state.

## Left navigation
Keep the four destinations and icons. Remove per-item description copy and the large bottom `真实来源模式` explainer card. Use a small non-interactive status dot/label near the brand or footer if needed. Active state remains obvious but quieter.

## Market Radar
- Short header: `市场雷达` + `从公开来源发现变化。`
- Market target controls become one compact horizontal/stacked form without a separate explanatory header block.
- Research status appears as a small inline status row only while running/failed/completed.
- Browser workspace remains the main content.
- Browserbase functionality stays, but the dark explanatory strip is removed.
- Locked state is represented by a small `解锁 Live` control in the browser toolbar. The long sentence about read-only behavior is removed.
- Snapshot fallback remains clearly labeled `快照` but does not compete with Live controls.

## Revenue
- Short header: `收益中心` + `只看真实机会、执行和结算。`
- Remove the large marketing-style supervision header and the five oversized pipeline cards.
- Replace pipeline with a compact horizontal status summary or slim metric row.
- Keep Revenue Live View, opportunity queue, ledger, and evidence as the core sections.
- Reduce repeated safety/guardrail prose; preserve actual controls and states.

## Settings
- Short header: `设置` + `连接、模型与运行状态。`
- Remove the large workspace identity card and the separate explanatory data-visibility cards.
- Keep runtime capability state in a simple table/list.
- Keep workspace links only if they add operational value; otherwise remove duplicates of sidebar navigation.
- Keep errors and retry actions explicit.

## Browserbase UI
The Browserbase panel is a tool, not a policy banner.
- remove `Browserbase 只读研究会话；Live View 内可以点击、滚动和检查公开证据，但自动任务不会登录或提交表单。`
- collapsed/locked toolbar shows only title, lock state, token input when needed, and `解锁 Live`
- unlocked toolbar shows `Live`, refresh/restart, external-open, lock
- iframe appears only when a Live View URL exists
- error messages remain visible and specific

## Responsive behavior
- Desktop: centered 1080-1180px workspace content, sidebar fixed.
- Tablet/mobile: same hierarchy, controls wrap vertically, no horizontal overflow for main forms.
- Avoid giant hero typography inside authenticated views; target 28-36px page titles and 18-24px idle-home prompt title.

## Verification
Add source-contract tests that assert removal of legacy verbose home blocks and Browserbase policy copy, presence of the compact home prompt and shared shell markers, and preservation of Browserbase interactive controls. Existing functional tests must remain green.