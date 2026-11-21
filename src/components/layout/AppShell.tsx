import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ChartNoAxesColumn, House, Plus, Settings, Target } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'
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
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent">
        Skip to content
      </a>

      {/* Sidebar / rail */}
      <aside className="hidden md:flex sticky top-0 h-dvh flex-col border-r border-line bg-[#0e110f] px-3 py-5 lg:px-4">
        <div className="mb-8 px-2 lg:px-2">
          <span className="lg:hidden">
            <LogoMark size={28} />
          </span>
          <Wordmark className="max-lg:hidden" />
        </div>
        <Button onClick={() => editor.create()} icon={<Plus size={16} />} className="mb-6 max-lg:hidden" title="Add transaction (N)" aria-keyshortcuts="N">
          Add transaction
        </Button>
        <IconButton label="Add transaction" onClick={() => editor.create()} className="mb-6 bg-accent text-on-accent hover:bg-accent-hover hover:text-on-accent lg:hidden mx-auto">
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
            <IconButton label="Add transaction" onClick={() => editor.create()} className="bg-accent text-on-accent hover:bg-accent-hover hover:text-on-accent size-9">
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
          <div className="mx-auto w-full max-w-[1180px] px-4 pb-32 pt-6 sm:px-6 md:pb-16 md:pt-8 lg:px-10 lg:pt-10">
            <ErrorBoundary resetKey={location.pathname}>
              <div key={location.pathname} className="ft-page">
                <Outlet />
              </div>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Phone tab bar: floating pill, active tab marked by a sliding lime blob */}
      <nav aria-label="Main" className="fixed inset-x-3 bottom-3 z-30 rounded-[22px] border border-line-strong bg-[#151a17]/90 shadow-[0_20px_40px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl pb-safe md:hidden">
        <ul className="grid grid-cols-5 p-1.5">
          {[...NAV, { to: '/settings', label: 'Settings', icon: Settings }].map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `ft-press relative isolate flex h-13 flex-col items-center justify-center gap-0.5 rounded-[16px] text-[10.5px] font-medium transition-colors duration-200 ${isActive ? 'text-on-accent' : 'text-ink-3'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="tab-blob" aria-hidden className="absolute inset-0 -z-10 rounded-[16px] bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                    <Icon size={19} strokeWidth={isActive ? 2.3 : 1.7} aria-hidden className="relative" />
                    <span className="relative">{label === 'Transactions' ? 'Activity' : label}</span>
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
        `ft-press group relative isolate flex h-10 items-center justify-center gap-3 rounded-sm px-2.5 text-sm font-medium transition-colors duration-[var(--duration-fast)] lg:justify-start ${
          isActive ? 'text-ink' : 'text-ink-3 hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span layoutId="side-pill" aria-hidden className="absolute inset-0 -z-10 rounded-sm border border-line-strong bg-sunken" transition={{ type: 'spring', stiffness: 520, damping: 38 }}>
              <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_12px_rgb(198_244_94/0.8)] max-lg:hidden" />
            </motion.span>
          )}
          <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} aria-hidden className={`relative transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110 ${isActive ? 'text-accent' : ''}`} />
          <span className="relative sr-only lg:not-sr-only">{label}</span>
        </>
      )}
    </NavLink>
  )
}
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-[2.6rem] sm:leading-[1.05]">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
