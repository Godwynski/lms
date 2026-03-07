'use client'

/**
 * SyncErrorBanner
 *
 * A fixed, dismissible banner at the top of the screen that shows
 * actionable messages when PowerSync fails to upload a change.
 *
 * Error types and their copy:
 *  rls      → "Permissions error" (warn the user data wasn't saved, contact admin)
 *  conflict → "Duplicate detected" (benign — another device saved first)
 *  auth     → "Session expired" (prompt to sign in again)
 *  network  → "Sync paused" (transient, auto-retry — auto-dismisses after 8 s)
 */

import { useSyncErrors } from '@/lib/powersync/hooks/useSyncErrors'
import Link from 'next/link'
import {
  ShieldAlert, Copy, LogIn, Wifi, X,
} from 'lucide-react'

const ICON_MAP = {
  rls: ShieldAlert,
  conflict: Copy,
  auth: LogIn,
  network: Wifi,
  unknown: ShieldAlert,
}

const COLOR_MAP = {
  rls:     'bg-red-50   border-red-200   text-red-800',
  conflict:'bg-amber-50 border-amber-200 text-amber-800',
  auth:    'bg-orange-50 border-orange-200 text-orange-800',
  network: 'bg-blue-50  border-blue-200  text-blue-800',
  unknown: 'bg-red-50   border-red-200   text-red-800',
}

const ICON_COLOR = {
  rls:     'text-red-500',
  conflict:'text-amber-500',
  auth:    'text-orange-500',
  network: 'text-blue-500',
  unknown: 'text-red-500',
}

export default function SyncErrorBanner() {
  const { error, dismiss } = useSyncErrors()
  if (!error) return null

  const Icon = ICON_MAP[error.type]
  const colorClass = COLOR_MAP[error.type]
  const iconColor = ICON_COLOR[error.type]

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        fixed top-0 left-0 right-0 z-[100]
        flex items-start sm:items-center justify-between gap-3
        px-4 py-3 border-b
        text-sm font-medium
        shadow-md backdrop-blur-sm
        transition-all duration-300
        ${colorClass}
      `}
    >
      {/* Left: icon + message */}
      <div className="flex items-start gap-2.5 min-w-0">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} aria-hidden />
        <div className="min-w-0">
          <span>{error.message}</span>

          {/* Auth errors get a sign-in link */}
          {error.type === 'auth' && (
            <Link
              href="/login"
              className="ml-2 underline underline-offset-2 font-semibold hover:opacity-80"
            >
              Sign in
            </Link>
          )}

          {/* RLS errors get an admin contact hint */}
          {error.type === 'rls' && (
            <span className="ml-2 opacity-70 text-xs">
              Contact your administrator if this persists.
            </span>
          )}

          {/* Network errors show auto-retry hint */}
          {error.type === 'network' && (
            <span className="ml-2 opacity-70 text-xs">
              Retrying automatically…
            </span>
          )}
        </div>
      </div>

      {/* Right: dismiss button */}
      <button
        onClick={dismiss}
        aria-label="Dismiss sync error"
        title="Dismiss"
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors ml-auto"
      >
        <X className="w-4 h-4" aria-hidden />
      </button>
    </div>
  )
}
