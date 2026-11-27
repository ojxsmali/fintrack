/**
 * Lazy entry points for the 3D layer. three.js loads only when a scene is
 * actually on the page, and only if the browser can do WebGL; otherwise the
 * caller's fallback (a flat SVG) stays put.
 */
import { Component, lazy, Suspense, type ReactNode } from 'react'
import { canUseWebGL, useCompact3D } from './webgl'
import type { StackDatum } from './Coins'

const LazyStacks = lazy(() => import('./Coins').then((m) => ({ default: m.MoneyStacksScene })))
const LazyCoin = lazy(() => import('./Coins').then((m) => ({ default: m.BrandCoinScene })))

/** If WebGL dies mid-session (context lost, driver issue), fall back instead of crashing the page. */
class Guard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function MoneyStacks3D(props: { data: StackDatum[]; selected: number; onPick: (i: number) => void; calm?: boolean; className?: string; fallback: ReactNode }) {
  const compact = useCompact3D()
  if (!canUseWebGL()) return <>{props.fallback}</>
  const { fallback, ...rest } = props
  return (
    <Guard fallback={fallback}>
      <Suspense fallback={fallback}>
        <LazyStacks {...rest} compact={compact} />
      </Suspense>
    </Guard>
  )
}

export function BrandCoin3D({ className = '', fallback, label }: { className?: string; fallback: ReactNode; label?: string }) {
  const compact = useCompact3D()
  if (!canUseWebGL()) return <>{fallback}</>
  return (
    <Guard fallback={fallback}>
      <Suspense fallback={fallback}>
        <LazyCoin className={className} compact={compact} label={label} />
      </Suspense>
    </Guard>
  )
}

export type { StackDatum }
