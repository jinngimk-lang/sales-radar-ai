---
name: codebase-design
description: Design deep modules with small interfaces, clean seams, high leverage, locality, and testability.
---

# Codebase Design

Use this vocabulary consistently:

- Module: interface plus implementation.
- Interface: everything a caller must know, including invariants and errors.
- Seam: where behavior can vary without editing the caller.
- Adapter: a concrete implementation at a seam.
- Depth: capability delivered per unit of interface complexity.
- Leverage: value shared across callers and tests.
- Locality: related behavior, failures, and verification remain together.

## Principles

- Prefer deep modules: small interface, substantial hidden behavior.
- The interface is also the test surface.
- Accept dependencies instead of constructing third-party clients internally.
- Return explicit results instead of hiding important side effects.
- Do not create a seam for a hypothetical second adapter.
- The deletion test: if deleting a module merely moves complexity into every caller, it was useful; if complexity disappears, it was probably a pass-through.

For Sales Radar AI, keep provider-specific details behind adapters, keep source/evidence/contact states explicit, and prevent UI components from orchestrating multi-step business workflows directly.
