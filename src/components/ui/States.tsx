import type { ReactNode } from 'react'
import { friendlyError } from '../../services/repository'
import { Button } from './Button'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}

/** Clean, text-led empty state. No illustrations. */
export function EmptyState({
  title,
  body,
  action,
  secondary,
  compact,
}: {
  title: string
  body?: ReactNode
  action?: ReactNode
  secondary?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={`flex flex-col items-start ${compact ? 'py-6' : 'py-12 md:py-16'}`}>
      <p className="text-base font-medium text-ink">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-ink-3">{body}</p>}
      {(action || secondary) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {action}
          {secondary}
        </div>
      )}
    </div>
  )
}

export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={`flex flex-col items-start ${compact ? 'py-4' : 'py-10'}`}>
      <p className="text-sm font-medium text-ink">We couldn’t load this.</p>
      <p className="mt-1 text-sm text-ink-3">{friendlyError(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
