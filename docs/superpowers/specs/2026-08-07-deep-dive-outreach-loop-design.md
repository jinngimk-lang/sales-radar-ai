# Deep-Dive, Human Outreach, and Action-Loop Design

## Problem
The table-first result view improved scan density, but several action paths remain weak:

1. `进入高级结果` links to `/app/discover?leadId=...`; `DiscoverPage` does not consume `leadId`, so the action loses context and appears to stall.
2. Generated outreach is structurally valid but still reads like generic AI sales copy because the prompt permits broad B2B phrasing and only blocks a narrow set of clichés.
3. Existing regression checks focus mainly on render/build success. They do not consistently assert that a critical user action produces a visible result, preserves context, provides a return path, and remains usable on a second invocation.
4. AI/Agent UI should behave like an invoked tool, not a resident panel that permanently consumes observation space.

## Approved UX
Use the existing table-first command-center flow as the primary workspace.

- Table remains the broad scan surface.
- Selecting a row opens the existing focused inspector.
- Replace `进入高级结果` with an in-place `深度分析` toggle inside the focused inspector. No route change is allowed for this action.
- Deep analysis shows the same selected object's verified contacts, evidence, score rationale, risk/uncertainty, suggested next action, and outreach entry point.
- Keep `打开完整档案` as the explicit full-page navigation to `/app/customer/:id`.
- Closing deep analysis returns to the normal focused card; closing the focused card restores the full-width table.

## On-Demand Agent Rule
AI is an invoked capability, not persistent page chrome.

- Do not render an expanded Agent panel when the user has not asked a question or triggered an Agent action.
- Keep only lightweight invocation affordances such as `问 Agent`, `生成话术`, or a command input.
- Mount/show Agent conversation and tool-trace UI only after a user request starts or while a request/result is active.
- The invoked Agent uses the same existing research/tool chain rather than a separate demo-only response path.
- The user can close/collapse Agent output; closing restores the underlying observation area.
- A second invocation after closing must work without stale state.

## Outreach Quality Rules
Generated outreach must be evidence-led and low-pressure.

- Use at most one verified observation as the opening hook.
- Explain one concrete relevance bridge from that observation to the seller's product/value proposition.
- End with one easy-to-answer question or permission-based next step.
- Do not claim monitoring, prior relationship, urgency, exclusivity, guaranteed outcomes, or private knowledge.
- Avoid generic AI/sales language such as: `empower`, `leading solution`, `comprehensive solution`, `one-stop solution`, `unlock value`, `synergy`, `looking forward to cooperation`, `we specialize in`, `I noticed recently`, and duplicated opening paragraphs.
- If evidence is too weak, return research advice rather than fabricating a persuasive pitch.
- Email, LinkedIn, and WhatsApp remain distinct channel formats; the quality gate applies to all.
- The no-GPT / fallback path must obey the same quality rules as the hosted model path.

## Action-Loop Regression Contract
For every critical user action covered by the command-center smoke contract, automated checks must verify:

1. Trigger exists and is actionable.
2. Trigger produces a visible state/data change.
3. The user has a deterministic return/close path.
4. A second invocation remains actionable after returning.
5. Route/query parameters written by a trigger must be consumed by the destination, otherwise the trigger is invalid.
6. Agent UI is absent/collapsed before invocation and visible only after an Agent action/request.

The initial contract covers result row selection, deep analysis toggle, full-profile navigation, outreach generation, and on-demand Agent invocation/collapse.

## Scope
No scoring-model changes, no search-provider changes, no contact scraping changes, and no new external dependencies. Reuse current `ChatSession`, `assistantScores`, `contacts`, `communicationProfile`, current Agent tool chain, and existing customer-detail route.