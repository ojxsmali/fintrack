import { AUTHOR } from '../../lib/brand'

/** "Designed & built by Ojas Mali" — linked when a profile URL is configured. */
export function AuthorCredit({ className = '' }: { className?: string }) {
  return (
    <p className={className}>
      Designed &amp; built by{' '}
      {AUTHOR.githubUrl ? (
        <a href={AUTHOR.githubUrl} target="_blank" rel="noreferrer" className="font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline">
          {AUTHOR.name}
        </a>
      ) : (
        <span className="font-medium text-ink-2">{AUTHOR.name}</span>
      )}
      {AUTHOR.repoUrl && (
        <>
          {' · '}
          <a href={AUTHOR.repoUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
            Source on GitHub
          </a>
        </>
      )}
    </p>
  )
}
