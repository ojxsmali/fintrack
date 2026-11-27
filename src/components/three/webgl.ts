import { useSyncExternalStore } from 'react'

let webgl: boolean | null = null
export function canUseWebGL() {
  if (webgl !== null) return webgl
  try {
    const c = document.createElement('canvas')
    webgl = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    webgl = false
  }
  return webgl
}

function media(query: string) {
  const subscribe = (cb: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {}
    const mq = window.matchMedia(query)
    mq.addEventListener?.('change', cb)
    return () => mq.removeEventListener?.('change', cb)
  }
  const read = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  return { subscribe, read }
}
const narrow = media('(max-width: 767px)')
/** Phones get fewer coins, a lower pixel ratio and no pointer parallax. */
export function useCompact3D() {
  return useSyncExternalStore(narrow.subscribe, narrow.read, () => false)
}
