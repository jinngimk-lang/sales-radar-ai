---
name: tdd
description: Test-driven development with vertical red-green slices through public interfaces.
---

# Test-Driven Development

Read `CONTEXT.md`, relevant ADRs, and `.agent/SKILL_REGISTRY.md` before writing tests.

## Test seams

Tests verify behavior through a public interface. For this repository, preferred seams are:

- User-visible React behavior and routing contracts.
- Frontend service-client contracts.
- Express HTTP routes and controllers.
- Domain service interfaces with injected upstream adapters.
- Persistence ownership and evidence-state transitions.

Do not test private methods or implementation formatting.

## Loop

For each vertical slice:

1. Write one test for one user-observable behavior.
2. Run it and confirm the expected red failure.
3. Implement only enough production code to pass.
4. Run the focused test green.
5. Run the surrounding suite before starting the next slice.

## Rules

- Red before green.
- One behavior per slice.
- Expected values come from the requirement, not from recomputing the implementation.
- Mock only system boundaries: third-party APIs, browser vendors, time, randomness, and occasionally databases.
- Do not mock internal modules to prove call order.
- Refactoring happens after behavior is green and is reviewed separately.
