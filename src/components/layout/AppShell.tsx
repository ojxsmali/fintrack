import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ChartNoAxesColumn, House, Plus, Settings, Target } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Wordmark, LogoMark } from '../ui/Logo'
import { ErrorBoundary } from './ErrorBoundary'
import { Button, IconButton } from '../ui/Button'
import { useTransactionEditor } from '../transactions/editorContext'
import { useAuth } from '../../services/authContext'
import { AuthorCredit } from './AuthorCredit'

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: House },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/analytics', label: 'Analytics', icon: ChartNoAxesColumn },
]

/**
 * Desktop ≥1024: labelled sidebar. Tablet 768–1023: icon rail.
 * Phone <768: compact top bar + bottom tab bar (visible navigation outperforms
 * hidden menus — NN/g), with "Add" kept in the top bar where the thumb isn't
 * fighting the tab bar.
 */
export function AppShell() {
  const editor = useTransactionEditor()
  const { workspace, hasBackend, startWorkspace } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  // Move focus to main content on route change for keyboard & screen-reader users.
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [location.pathname])


  return (
    <div className="min-h-dvh md:grid md:grid-cols-[72px_1fr] lg:grid-cols-[232px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Skip to content
      </a>

      {/* Sidebar / rail */}
      <aside className="hidden md:flex sticky top-0 h-dvh flex-col border-r border-line bg-paper px-3 py-5 lg:px-4">
        <div className="mb-8 px-2 lg:px-2">
          <span className="lg:hidden">
            <LogoMark size={28} />
          </span>
          <Wordmark className="max-lg:hidden" />
        </div>
        <Button onClick={() => editor.create()} icon={<Plus size={16} />} className="mb-6 max-lg:hidden" title="Add transaction (N)" aria-keyshortcuts="N">
          Add transaction
        </Button>
        <IconButton label="Add transaction" onClick={() => editor.create()} className="mb-6 bg-ink text-paper hover:bg-[#33322e] hover:text-paper lg:hidden mx-auto">
          <Plus size={18} />
        </IconButton>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <SideLink key={n.to} {...n} />
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-0.5">
          <SideLink to="/settings" label="Settings" icon={Settings} />
          <AuthorCredit className="mt-4 hidden px-2.5 text-2xs leading-snug text-ink-4 lg:block" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Phone top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur-sm md:hidden">
          <Wordmark />
          <div className="flex items-center gap-1">
            <IconButton label="Add transaction" onClick={() => editor.create()} className="bg-ink text-paper hover:bg-[#33322e] hover:text-paper size-9">
              <Plus size={18} />
            </IconButton>
          </div>
        </header>
        {workspace && (
          <div
            role="note"
            className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs sm:text-sm ${workspace === 'sample' ? 'bg-accent-soft text-accent' : 'bg-sunken text-ink-2'}`}
          >
            {workspace === 'sample' ? (
              <>
                <span>
                  <strong className="font-semibold">Prototype</strong> — you’re exploring sample data.
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await startWorkspace('own')
                    navigate('/dashboard')
                  }}
                  className="font-semibold underline underline-offset-2 hover:no-underline"
                >
                  Build your own FinTrack →
                </button>
              </>
            ) : (
              <>
                <span>
                  <strong className="font-semibold text-ink">Your FinTrack</strong> — saved privately in this browser.
                </span>
                {hasBackend ? (
                  <Link to="/signup" className="font-semibold text-accent underline underline-offset-2 hover:no-underline">
                    Prefer a synced account? Sign up
                  </Link>
                ) : null}
              </>
            )}
          </div>
        )}

        <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
          <div className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-6 sm:px-6 md:pb-16 md:pt-8 lg:px-10 lg:pt-10">
            <ErrorBoundary resetKey={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Phone tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-sm pb-safe md:hidden">
        <ul className="grid grid-cols-5">
          {[...NAV, { to: '/settings', label: 'Settings', icon: Settings }].map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors ${isActive ? 'text-ink' : 'text-ink-3'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.1 : 1.7} aria-hidden />
                    <span>{label === 'Transactions' ? 'Activity' : label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function SideLink({ to, label, icon: Icon }: { to: string; label: string; icon: typeof House }) {
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        `group relative flex h-10 items-center justify-center gap-3 rounded-sm px-2.5 text-sm font-medium transition-colors duration-[var(--duration-fast)] lg:justify-start ${
          isActive ? 'bg-sunken text-ink' : 'text-ink-3 hover:bg-sunken/60 hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={isActive ? 2.1 : 1.7} aria-hidden />
          <span className="sr-only lg:not-sr-only">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
