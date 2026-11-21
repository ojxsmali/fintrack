import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(QUERY)
  mq.addEventListener?.('change', cb)
  return () => mq.removeEventListener?.('change', cb)
}

const read = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false)

/** True when the visitor has asked the OS for reduced motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}
