import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Explicit (no `test.globals` in vite.config.ts, matching this repo's
// explicit-import style everywhere else) — without this, render() output
// from one test accumulates into the next.
afterEach(cleanup)

// jsdom doesn't implement these, but Radix UI (used throughout components/ui)
// calls them during open/close and scroll-into-view handling. Stub them out
// so component tests involving Popover/Select/Dialog/etc. don't throw.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
if (typeof ResizeObserver === 'undefined') {
  // Minimal stub — jsdom has no layout engine to observe anyway.
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom has no matchMedia; next-themes reads it for the "system" theme. Report
// "light" and ignore listeners.
if (typeof window.matchMedia === 'undefined') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
