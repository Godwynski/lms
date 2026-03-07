'use client'

/**
 * SyncStatusBadge
 *
 * A pill-shaped badge that shows real-time PowerSync sync state.
 * Positioning: fixed bottom-right on desktop, bottom-left on mobile
 * (away from the bottom nav area so nothing gets covered).
 *
 * States:
 *  • syncing   – spinner + "Syncing…"    (indigo)
 *  • online    – green dot + "Synced"    (green)
 *  • offline   – lightning bolt + "Offline" (amber)
 */

import { usePowerSyncStatus } from '@powersync/react'
import { useEffect, useState } from 'react'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'

type SyncPhase = 'syncing' | 'online' | 'offline'

export default function SyncStatusBadge() {
  const status = usePowerSyncStatus()
  const [phase, setPhase] = useState<SyncPhase>('offline')
  const [visible, setVisible] = useState(true)
  const [autoHideTimer, setAutoHideTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const connected = status?.connected ?? false
    const connecting = status?.connecting ?? false
    const uploading = status?.dataFlowStatus?.uploading ?? false
    const downloading = status?.dataFlowStatus?.downloading ?? false
    const syncing = uploading || downloading || connecting

    let next: SyncPhase
    if (!connected && !connecting) {
      next = 'offline'
    } else if (syncing) {
      next = 'syncing'
    } else {
      next = 'online'
    }

    setPhase(next)
    setVisible(true)

    // Auto-hide the "Synced" state after 3 s — keeps the UI clean
    if (autoHideTimer) clearTimeout(autoHideTimer)
    if (next === 'online') {
      const t = setTimeout(() => setVisible(false), 3000)
      setAutoHideTimer(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, status?.connecting, status?.dataFlowStatus?.uploading, status?.dataFlowStatus?.downloading])

  if (!visible) {
    // Render a tiny ghost dot so users can hover to reveal the badge
    return (
      <button
        onClick={() => setVisible(true)}
        title="Sync status"
        aria-label="Show sync status"
        className="fixed bottom-4 right-4 z-50 w-3 h-3 rounded-full bg-green-400/60 hover:scale-125 transition-transform"
      />
    )
  }

  const config: Record<SyncPhase, {
    bg: string
    border: string
    text: string
    label: string
    icon: React.ReactNode
  }> = {
    syncing: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      label: 'Syncing…',
      icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden />,
    },
    online: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      label: 'Synced',
      icon: <Wifi className="w-3.5 h-3.5" aria-hidden />,
    },
    offline: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      label: 'Offline',
      icon: <WifiOff className="w-3.5 h-3.5" aria-hidden />,
    },
  }

  const c = config[phase]

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Sync status: ${c.label}`}
      className={`
        fixed bottom-20 right-4 z-50
        sm:bottom-4 sm:right-4
        flex items-center gap-1.5
        px-3 py-1.5 rounded-full
        text-xs font-semibold
        border shadow-sm backdrop-blur-sm
        select-none transition-all duration-300
        ${c.bg} ${c.border} ${c.text}
      `}
    >
      {c.icon}
      <span>{c.label}</span>
    </div>
  )
}
