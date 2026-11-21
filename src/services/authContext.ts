import { createContext, useContext } from 'react'
import type { FinanceRepo } from './repository'

export interface SessionUser {
  id: string
  email: string | null
}

export type Status = 'loading' | 'signedOut' | 'signedIn'

/**
 * 'sample' — the prototype: a guest workspace pre-filled with labelled sample data.
 * 'own'    — "Build your own": a guest workspace that starts empty.
 * Both live only in this browser. null = a real (Supabase) account or nobody.
 */
export type Workspace = 'sample' | 'own'

export interface AuthContextValue {
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

export const AuthContext = createContext<AuthContextValue | null>(null)

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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
