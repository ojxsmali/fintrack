import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './backend'
import { createDemoRepo, createLocalDemoStorage, DEMO_STORAGE_KEY, freshDemoState } from './demoRepo'
import { createSupabaseRepo } from './supabaseRepo'
import type { FinanceRepo } from './repository'

export interface SessionUser {
  id: string
  email: string | null
}

type Status = 'loading' | 'signedOut' | 'signedIn'

/**
 * 'sample' — the prototype: a guest workspace pre-filled with labelled sample data.
 * 'own'    — "Build your own": a guest workspace that starts empty.
 * Both live only in this browser. null = a real (Supabase) account or nobody.
 */
export type Workspace = 'sample' | 'own'

interface AuthContextValue {
  status: Status
  user: SessionUser | null
  /** 'demo' = browser-only workspace; 'supabase' = real account. */
  mode: 'supabase' | 'demo'
  workspace: Workspace | null
  /** Whether real accounts are available (Supabase keys configured). */
  hasBackend: boolean
  repo: FinanceRepo
  signIn(email: string, password: string): Promise<void>
  signUp(name: string, email: string, password: string, currency?: string): Promise<{ needsConfirmation: boolean }>
  signOut(): Promise<void>
  /** Re-send the sign-up confirmation email. */
  resendConfirmation(email: string): Promise<void>
  /** A message from the auth redirect (e.g. an expired confirmation link), shown once on the sign-in page. */
  notice: string | null
  clearNotice(): void
  /** Open (or create) a browser-only workspace. */
  startWorkspace(kind: Workspace, name?: string, currency?: string): Promise<void>
  /** Erase the current browser-only workspace and return to the welcome page. */
  resetWorkspace(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const WORKSPACE_KEY = 'fintrack.workspace'
const OWN_STORAGE_KEY = 'fintrack.own.v1'

const storages = {
  sample: createLocalDemoStorage(DEMO_STORAGE_KEY),
  own: createLocalDemoStorage(OWN_STORAGE_KEY),
}

function activeWorkspace(): Workspace | null {
  try {
    const w = localStorage.getItem(WORKSPACE_KEY)
    if ((w === 'sample' || w === 'own') && storages[w].load()) return w
  } catch {
    /* storage blocked */
  }
  return null
}

/** Supabase auth messages → copy a person can act on. */
export function authMessage(raw: string | undefined): string {
  const m = (raw ?? '').toLowerCase()
  if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit')) return 'We’ve sent too many emails in the last hour. Please try again a little later.'
  if (m.includes('database error')) return 'We couldn’t finish setting up your account. Please try again in a moment.'
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'New sign-ups are switched off right now.'
  if (m.includes('email address') && m.includes('invalid')) return 'That email address can’t be used. Check it and try again.'
  if (m.includes('expired') || m.includes('otp')) return 'That confirmation link has expired or was already used. Sign in, or ask for a new link.'
  if (m.includes('invalid login')) return 'That email and password don’t match. Check them and try again.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Try signing in instead.'
  if (m.includes('email not confirmed')) return 'Confirm your email first — check your inbox for the link.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.'
  if (m.includes('password')) return 'Choose a stronger password — at least 8 characters.'
  if (m.includes('fetch') || m.includes('network')) return 'We couldn’t reach FinTrack’s servers. Check your connection and try again.'
  return 'We couldn’t sign you in right now. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [workspace, setWorkspace] = useState<Workspace | null>(activeWorkspace)
  const [realStatus, setRealStatus] = useState<Status>(supabase ? 'loading' : 'signedOut')
  const [realUser, setRealUser] = useState<SessionUser | null>(null)
  // Supabase reports a failed email link in the URL hash (e.g. #error_code=otp_expired).
  const [notice, setNotice] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const p = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1))
    const err = p.get('error_description') || p.get('error_code')
    if (!err) return null
    window.history.replaceState(null, '', window.location.pathname)
    return authMessage(err)
  })

  const repos = useMemo(
    () => ({
      sample: createDemoRepo(storages.sample),
      own: createDemoRepo(storages.own),
      supabase: supabase ? createSupabaseRepo(supabase) : null,
    }),
    [],
  )

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setRealUser(u ? { id: u.id, email: u.email ?? null } : null)
      setRealStatus(u ? 'signedIn' : 'signedOut')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user
      setRealUser(u ? { id: u.id, email: u.email ?? null } : null)
      setRealStatus(u ? 'signedIn' : 'signedOut')
      // Never let one user's cached data render for another.
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') qc.clear()
    })
    return () => sub.subscription.unsubscribe()
  }, [qc])

  const leaveWorkspace = useCallback(() => {
    localStorage.removeItem(WORKSPACE_KEY)
    setWorkspace(null)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error('Sign-in needs a configured backend.')
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw new Error(authMessage(error.message))
      leaveWorkspace()
    },
    [leaveWorkspace],
  )

  const signUp = useCallback(
    async (name: string, email: string, password: string, currency = 'INR') => {
      if (!supabase) throw new Error('Sign-up needs a configured backend.')
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim(), currency }, emailRedirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) throw new Error(authMessage(error.message))
      // With email confirmation on, Supabase returns a "user" with no identities for an
      // address that's already registered (to avoid leaking which emails exist).
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Try signing in instead.')
      }
      if (data.session) leaveWorkspace()
      return { needsConfirmation: !data.session }
    },
    [leaveWorkspace],
  )

  const resendConfirmation = useCallback(async (email: string) => {
    if (!supabase) return
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/dashboard` } })
    if (error) throw new Error(authMessage(error.message))
  }, [])

  const signOut = useCallback(async () => {
    if (workspace) leaveWorkspace()
    else if (supabase) await supabase.auth.signOut()
    qc.clear()
  }, [workspace, leaveWorkspace, qc])

  const startWorkspace = useCallback(
    async (kind: Workspace, name = '', currency = 'INR') => {
      const store = storages[kind]
      if (!store.load()) {
        // The prototype's sample data is in rupees, so it always uses INR.
        const state = freshDemoState(name.trim(), kind === 'sample' ? 'INR' : currency)
        if (kind === 'sample') {
          const { buildSampleData } = await import('../lib/sampleData')
          const plan = buildSampleData(state.categories, state.accounts[0].id)
          const now = Date.now()
          state.transactions = plan.transactions.map((t, i) => ({ ...t, id: crypto.randomUUID(), created_at: new Date(now - i).toISOString() }))
          state.budgets = plan.budgets.map((b) => ({ ...b, id: crypto.randomUUID(), is_sample: true }))
        }
        store.save(state)
      }
      localStorage.setItem(WORKSPACE_KEY, kind)
      qc.clear()
      setWorkspace(kind)
    },
    [qc],
  )

  const resetWorkspace = useCallback(() => {
    if (workspace) storages[workspace].clear()
    leaveWorkspace()
    qc.clear()
  }, [workspace, leaveWorkspace, qc])

  const value = useMemo<AuthContextValue>(() => {
    const local = workspace ?? (supabase ? null : 'own')
    return {
      status: workspace ? 'signedIn' : realStatus,
      user: workspace ? { id: `guest-${workspace}`, email: null } : realUser,
      mode: workspace || !supabase ? 'demo' : 'supabase',
      workspace,
      hasBackend: !!supabase,
      repo: local ? repos[local] : repos.supabase!,
      signIn,
      signUp,
      signOut,
      resendConfirmation,
      notice,
      clearNotice: () => setNotice(null),
      startWorkspace,
      resetWorkspace,
    }
  }, [workspace, realStatus, realUser, repos, signIn, signUp, signOut, resendConfirmation, notice, startWorkspace, resetWorkspace])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
