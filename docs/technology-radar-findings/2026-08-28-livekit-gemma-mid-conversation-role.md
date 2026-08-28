# LiveKit Gemma mid-conversation role reliability finding

Date: 2026-08-28
Status: pending reconciliation into `docs/technology-radar.md`

## Upstream identity

- Project: `livekit/agents`
- License: Apache-2.0 (already verified in the canonical radar)
- Current observed Python package: `livekit-agents@1.7.1`, published 2026-08-27
- Canonical issue: https://github.com/livekit/agents/issues/7020
- Related open fix PR: https://github.com/livekit/agents/pull/6591

## Finding

Issue #7020, opened 2026-08-28, reproduces a role-semantics failure in LiveKit Inference with `google/gemma-4-31b-it`. Mid-conversation instructions appended by `generate_reply(instructions=...)` remain a trailing `system` role on the OpenAI-format gateway path. Gemma only expects the system turn at the beginning of its chat template, so the model can answer the agent's own previous question as if it were the caller, emit stage directions, or silently call a tool instead of producing the intended agent check-in.

The reporter's deterministic reproduction includes an assistant question plus a tool-call turn: the current trailing-system path produced zero correct silence check-ins in six runs, while converting the same instruction into a position-preserving user turn produced six correct check-ins in six runs. The report also describes the same class of role inversion on production calls.

Related PR #6591 already proposes routing affected gateway/model paths through `convert_mid_conversation_instructions`, and includes gateway/serializer tests, but it remains open and unmerged as of this scan.

## Sales Radar implication

This is a realtime identity and communication-integrity gate, not an adoption trigger. A future LiveKit runtime must not assume that a provider/model accepting a request preserves speaker-role semantics.

Before any Gemma or other non-OpenAI chat-template model is promoted through a LiveKit/OpenAI-format inference gateway, the benchmark must:

1. include mid-conversation `generate_reply(instructions=...)` after normal assistant/user/tool-call history;
2. assert that the model never speaks the caller/user side of the conversation or treats agent instructions as caller content;
3. verify the serialized provider role sequence, not only the high-level `ChatContext`;
4. test silence reminders, guard retries and handoff/instruction injection sites;
5. keep any role inversion as an explicit runtime failure and never promote it into sent/replied/meeting or other communication truth;
6. verify the released upstream fix (or an isolated adapter-level normalization) before production promotion.

LiveKit remains `WATCH`. No runtime, provider or dependency is added by this finding. `PROJECT_BLUEPRINT.md` does not change because the product/architecture direction is unchanged.

## Rollback / adoption boundary

Current rollback remains “no LiveKit runtime installed.” If a future isolated experiment adds role normalization, it must remain inside a replaceable runtime/provider adapter and be removable without changing Sales Radar communication evidence semantics.
