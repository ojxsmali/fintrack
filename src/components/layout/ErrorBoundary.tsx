import { Component, type ReactNode } from 'react'
import { Button } from '../ui/Button'

/** Catches render errors in a page so one broken view never blanks the app. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { failed: boolean; resetKey?: string }> {
  state: { failed: boolean; resetKey?: string } = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[FinTrack] page crashed', error)
  }

  // Navigating to another route (new resetKey) clears a crashed page.
  static getDerivedStateFromProps(props: { resetKey?: string }, state: { failed: boolean; resetKey?: string }) {
    if (props.resetKey !== state.resetKey) return { failed: false, resetKey: props.resetKey }
    return null
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="py-16">
        <p className="text-base font-medium">This page ran into a problem.</p>
        <p className="mt-1 text-sm text-ink-3">Your data is safe. Reload to try again — if it keeps happening, let us know.</p>
        <Button variant="secondary" className="mt-4" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    )
  }
}
