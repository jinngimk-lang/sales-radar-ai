export function isInteractiveResultTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'a, button, input, select, textarea, summary, [role="button"]',
      ),
    )
  )
}
