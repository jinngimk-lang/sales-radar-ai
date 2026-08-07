# Frontend runtime incident

Production symptoms:

- `/app/account` intermittently rendered an unknown-error screen.
- The same page could remain indefinitely on the runtime-capability loading state.

Confirmed prevention requirements:

- Runtime capability payloads are normalized before rendering.
- Missing capability fields render an unavailable state instead of throwing.
- Frontend API requests have a bounded timeout and a visible retry path.
- React render failures stay inside an application-owned recovery screen.
- The hotfix merges only after frontend typecheck, regression tests, production build, and unchanged backend checks pass.
