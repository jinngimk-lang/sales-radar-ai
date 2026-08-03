import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDrawerA11y<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const drawerRef = useRef<T>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const drawer = drawerRef.current
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow

    const focusableElements = () =>
      drawer
        ? Array.from(
            drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
          ).filter((element) => !element.hasAttribute('disabled'))
        : []

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !drawer) return

      const elements = focusableElements()
      if (elements.length === 0) {
        event.preventDefault()
        drawer.focus()
        return
      }

      const first = elements[0]!
      const last = elements[elements.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    const focusFrame = window.requestAnimationFrame(() => {
      focusableElements()[0]?.focus() ?? drawer?.focus()
    })

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open])

  return drawerRef
}
