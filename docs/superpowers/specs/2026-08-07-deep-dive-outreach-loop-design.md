# Deep-Dive, Human Outreach, and Action-Loop Design

## Problem
The table-first result view improved scan density, but two action paths remain weak:

1. `进入高级结果` links to `/app/discover?leadId=...`; `DiscoverPage` does not consume `leadId`, so the action loses context and appears to stall.
2. Generated outreach is structurally valid but still reads like generic AI sales copy because the prompt permits broad B2B phrasing and only blocks a narrow set of clichés.
3. Existing regression checks focus mainly on render/build success. They do not consistently assert that a critical user action produces a visible result, preserves context, provides a return path, and remains usable on a second invocation.

## Approved UX
Use the existing table-first command-center flow as the primary workspace.

- Table remains the broad scan surface.
- Selecting a row opens the existing focused inspector.
- Replace `进入高级结果` with an in-place `深度分析` toggle inside the focused inspector. No route change is allowed for this action.
- Deep analysis shows the same selected object's verified contacts, evidence, score rationale, risk/uncertainty, suggested next action, and outreach entry point.
- Keep `打开完整档案` as the explicit full-page navigation to `/app/customer/:id`.
- Closing deep analysis returns to the normal focused card; closing the focused card restores the full-width table.

## Outreach Quality Rules
Generated outreach must be evidence-led and low-pressure.

- Use at most one verified observation as the opening hook.
- Explain one concrete relevance bridge from that observation to the seller's product/value proposition.
- End with one easy-to-answer question or permission-based next step.
- Do not claim monitoring, prior relationship, urgency, exclusivity, guaranteed outcomes, or private knowledge.
- Avoid generic AI/sales language such as: `empower`, `leading solution`, `comprehensive solution`, `one-stop solution`, `unlock value`, `synergy`, `looking forward to cooperation`, `we specialize in`, `I noticed recently`, and duplicated opening paragraphs.
- If evidence is too weak, return research advice rather than fabricating a persuasive pitch.
- Email, LinkedIn, and WhatsApp remain distinct channel formats; the quality gate applies to all.

## Action-Loop Regression Contract
For every critical user action covered by the command-center smoke contract, automated checks must verify:

1. Trigger exists and is actionable.
2. Trigger produces a visible state/data change.
3. The user has a deterministic return/close path.
4. A second invocation remains actionable after returning.
5. Route/query parameters written by a trigger must be consumed by the destination, otherwise the trigger is invalid.

The initial contract covers result row selection, deep analysis toggle, full-profile navigation, and outreach generation entry points.

## Scope
No scoring-model changes, no search-provider changes, no contact scraping changes, and no new external dependencies. Reuse current `ChatSession`, `assistantScores`, `contacts`, `communicationProfile`, and existing customer-detail route.