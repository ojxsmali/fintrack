import type { ReactNode } from 'react'

/**
 * A titled region. Not every section is a card: `plain` panels sit directly on
 * the page and rely on spacing + a hairline header for structure.
 */
export function Panel({
  title,
  description,
  action,
  children,
  plain,
  className = '',
  id,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  plain?: boolean
  className?: string
  id?: string
}) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section
      aria-labelledby={headingId}
      className={`${plain ? '' : 'ft-card rounded-lg border border-line bg-surface px-4 py-4 md:px-5 md:py-5'} min-w-0 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-sm font-semibold text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
