import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { AuthProvider } from './services/auth'
import { useAuth } from './services/authContext'
import { ToastProvider } from './components/ui/Toast'
import { TransactionEditorProvider } from './components/transactions/TransactionEditor'
import { AppShell } from './components/layout/AppShell'
import { LoginPage, SignupPage } from './pages/AuthPages'
import { WelcomePage } from './pages/WelcomePage'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { Skeleton } from './components/ui/States'
import { AppError } from './services/repository'

// Chart-heavy routes are split so the login page never downloads Recharts.
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then((m) => ({ default: m.TransactionsPage })))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage').then((m) => ({ default: m.BudgetsPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      // Don't hammer the server on auth/validation failures.
      retry: (count, err) => !(err instanceof AppError && ['auth', 'fk', 'check'].includes(err.code)) && count < 2,
    },
  },
})

const TITLES: Record<string, string> = {
  '/': 'FinTrack — personal finance, made legible',
  '/login': 'Sign in · FinTrack',
  '/signup': 'Create account · FinTrack',
  '/dashboard': 'Overview · FinTrack',
  '/transactions': 'Transactions · FinTrack',
  '/budgets': 'Budgets · FinTrack',
  '/analytics': 'Analytics · FinTrack',
  '/settings': 'Settings · FinTrack',
}

/** Gives every route its own browser-tab title (history, bookmarks, screen readers). */
function DocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = TITLES[pathname] ?? 'FinTrack'
  }, [pathname])
  return null
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading')
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-2 w-24" />
      </div>
    )
  if (status === 'signedOut') return <Navigate to="/" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

function PageFallback() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-40" />
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <DocumentTitle />
            <ErrorBoundary>
            <Routes>
              <Route path="/" element={<WelcomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                element={
                  <RequireAuth>
                    <TransactionEditorProvider>
                      <AppShell />
                    </TransactionEditorProvider>
                  </RequireAuth>
                }
              >
                {(
                  [
                    ['/dashboard', <DashboardPage key="dashboard" />],
                    ['/transactions', <TransactionsPage key="transactions" />],
                    ['/budgets', <BudgetsPage key="budgets" />],
                    ['/analytics', <AnalyticsPage key="analytics" />],
                    ['/settings', <SettingsPage key="settings" />],
                  ] as const
                ).map(([path, el]) => (
                  <Route key={path} path={path} element={<Suspense fallback={<PageFallback />}>{el}</Suspense>} />
                ))}
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </ErrorBoundary>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
    </MotionConfig>
  )
}
