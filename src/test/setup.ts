import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})

// jsdom doesn't implement <dialog> modality yet.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
}

window.scrollTo = (() => {}) as typeof window.scrollTo

// Recharts' ResponsiveContainer needs ResizeObserver.
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as Record<string, unknown>).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom has no IntersectionObserver; motion's whileInView and our reveals need one.
// This stub reports every element as visible straight away.
if (!('IntersectionObserver' in globalThis)) {
  ;(globalThis as Record<string, unknown>).IntersectionObserver = class {
    private cb: (e: { isIntersecting: boolean; target: Element }[]) => void
    constructor(cb: (e: { isIntersecting: boolean; target: Element }[]) => void) {
      this.cb = cb
    }
    observe(target: Element) {
      this.cb([{ isIntersecting: true, target }])
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
}
