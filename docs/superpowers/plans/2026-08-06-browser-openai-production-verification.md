# Browser and OpenAI Production Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make embedded desktop websites fully visible from left to right and expose a safe, cached OpenAI runtime verification result for production diagnostics.

**Architecture:** The preview uses a fixed 1440px iframe viewport and a `ResizeObserver`-driven scale derived from the actual container width. The backend performs a minimal OpenAI Responses API probe through a dedicated verifier that never exposes credentials, caches its result, and reports only readiness metadata through the capabilities endpoint.

**Tech Stack:** React 18, TypeScript, Vite, Express, Node test runner, OpenAI Responses API, GitHub Actions, Vercel, Railway.

## Global Constraints

- Never expose or commit an API key.
- Never create horizontal scrolling in the outer market workspace.
- Keep browser and signal timeline heights aligned.
- Production readiness metadata may include provider, model, status, timestamp, and sanitized error code only.
- External API failure must not crash the backend process.

---

### Task 1: Responsive complete desktop preview

**Files:**
- Modify: `src/features/market-intelligence/MarketBrowserWorkspace.tsx`
- Test: `src/features/market-intelligence/market-browser-layout.test.ts`

- [ ] Write a failing regression test requiring a 1440px viewport, `ResizeObserver`, container-width scale calculation, and removal of the fixed scale constant.
- [ ] Confirm the existing implementation fails the regression test.
- [ ] Add a preview container ref and observe its width.
- [ ] Calculate `Math.min(1, availableWidth / 1440)` and apply it to a 1440px iframe.
- [ ] Set the scaled wrapper height so vertical scrolling matches the rendered document height.
- [ ] Run frontend typecheck, tests, and production build.

### Task 2: OpenAI runtime verifier

**Files:**
- Create: `backend/src/services/openai-runtime-verifier.service.ts`
- Modify: `backend/src/routes/health.routes.ts`
- Test: `backend/tests/openai-runtime-verifier.test.ts`
- Modify: `.github/workflows/ci.yml`

- [ ] Write tests for missing key, successful minimal Responses API call, sanitized authentication failure, timeout, and cache behavior.
- [ ] Implement a verifier that sends a minimal deterministic request and stores only sanitized readiness metadata.
- [ ] Start verification asynchronously when capabilities are requested and return the latest cached result without returning the key or raw upstream body.
- [ ] Add the verifier test to backend CI.
- [ ] Run Prisma validation, backend typecheck, tests, and production build.

### Task 3: Release and production checks

**Files:**
- Modify: `docs/deployment.md` if the current instructions do not describe runtime verification.

- [ ] Update the PR with verification evidence.
- [ ] Mark the PR ready only after all CI jobs pass.
- [ ] Squash merge into `main`.
- [ ] Confirm `main` CI, Vercel deployment, and both Railway deployment checks succeed.
- [ ] Inspect `/api/health/capabilities` from an environment that can resolve the production domain and confirm the OpenAI runtime status is ready; otherwise report the exact external-access blocker without claiming success.
