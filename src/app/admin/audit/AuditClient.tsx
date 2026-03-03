'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  ScanLine, CheckCircle2, AlertTriangle, XCircle,
  Download, RotateCcw, Play, Square, BookOpen, Info
} from 'lucide-react'
import { lookupBookByISBN, type AuditBookResult } from '@/app/admin/audit/actions'

// Lazy-load the camera scanner to avoid SSR issues
const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false })

// ── Types ────────────────────────────────────────────────────
type ScanStatus = 'found' | 'not_in_db' | 'duplicate'

type ScanEntry = {
  id: string          // unique scan event ID
  isbn: string
  scannedAt: Date
  status: ScanStatus
  book: AuditBookResult | null
}

type SessionPhase = 'idle' | 'scanning' | 'summary'

// ── Helper: generate CSV ─────────────────────────────────────
function buildSessionCSV(
  scans: ScanEntry[],
  allBooks: AuditBookResult[],
  scannedISBNs: Set<string>
): string {
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const headers = ['isbn', 'title', 'author', 'shelf_location', 'status', 'scanned_at']

  const scansRows = scans.map(s => [
    s.isbn,
    s.book?.title ?? 'Unknown',
    s.book?.author ?? '',
    s.book?.shelf_location ?? '',
    s.status,
    s.scannedAt.toISOString(),
  ].map(escape).join(','))

  // Missing: in DB (available) but not scanned
  const missingRows = allBooks
    .filter(b => b.isbn && !scannedISBNs.has(b.isbn) && b.available_copies > 0)
    .map(b => [b.isbn, b.title, b.author ?? '', b.shelf_location ?? '', 'missing', ''].map(escape).join(','))

  const allRows = [...scansRows, ...missingRows]

  return [headers.join(','), ...allRows].join('\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Status badge component ───────────────────────────────────
function StatusBadge({ status }: { status: ScanStatus }) {
  if (status === 'found') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Matched
    </span>
  )
  if (status === 'duplicate') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Duplicate
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" aria-hidden="true" /> Not in DB
    </span>
  )
}

// ── Main component ───────────────────────────────────────────
type Props = {
  allBooks: AuditBookResult[]
}

export default function AuditClient({ allBooks }: Props) {
  const [phase, setPhase] = useState<SessionPhase>('idle')
  const [showScanner, setShowScanner] = useState(false)
  const [scans, setScans] = useState<ScanEntry[]>([])
  const [scannedISBNs] = useState(() => new Map<string, number>()) // isbn → count
  const [lookupPending, setLookupPending] = useState(false)
  const [lastScanLabel, setLastScanLabel] = useState<string | null>(null)

  // Build a lookup map from ISBN for O(1) access
  const booksByISBN = useMemo(
    () => new Map(allBooks.filter(b => b.isbn).map(b => [b.isbn!, b])),
    [allBooks]
  )

  const handleScan = useCallback(async (rawValue: string) => {
    if (lookupPending) return // debounce while waiting for previous lookup

    const isbn = rawValue.trim()
    setShowScanner(false) // hide scanner while processing
    setLookupPending(true)

    const prevCount = scannedISBNs.get(isbn) ?? 0
    scannedISBNs.set(isbn, prevCount + 1)

    let status: ScanStatus
    let book: AuditBookResult | null = booksByISBN.get(isbn) ?? null

    if (!book) {
      // Try server in case this book was added after page load
      const result = await lookupBookByISBN(isbn)
      book = result ?? null
      status = book ? 'found' : 'not_in_db'
    } else if (prevCount > 0) {
      status = 'duplicate'
    } else {
      status = 'found'
    }

    const entry: ScanEntry = {
      id: `${isbn}-${Date.now()}`,
      isbn,
      scannedAt: new Date(),
      status,
      book,
    }

    setScans(prev => [entry, ...prev])
    setLastScanLabel(book?.title ?? isbn)
    setLookupPending(false)
    // Re-open scanner for next item
    setShowScanner(true)
  }, [lookupPending, scannedISBNs, booksByISBN])

  const startSession = () => {
    setScans([])
    scannedISBNs.clear()
    setLastScanLabel(null)
    setPhase('scanning')
    setShowScanner(true)
  }

  const endSession = () => {
    setShowScanner(false)
    setPhase('summary')
  }

  const resetSession = () => {
    setPhase('idle')
    setScans([])
    scannedISBNs.clear()
    setLastScanLabel(null)
    setShowScanner(false)
  }

  // Discrepancy stats
  const scannedSet = new Set(scans.filter(s => s.status !== 'not_in_db').map(s => s.isbn))
  const matchedCount = scans.filter(s => s.status === 'found').length
  const duplicateCount = scans.filter(s => s.status === 'duplicate').length
  const notInDBCount = scans.filter(s => s.status === 'not_in_db').length
  const missingBooks = allBooks.filter(b => b.isbn && !scannedSet.has(b.isbn) && b.available_copies > 0)

  const handleExport = () => {
    const csv = buildSessionCSV(scans, allBooks, scannedSet)
    const date = new Date().toISOString().slice(0, 10)
    downloadCSV(csv, `audit_session_${date}.csv`)
  }

  // ── IDLE phase ──────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center shadow-xl shadow-violet-500/30">
          <ScanLine className="w-8 h-8 text-white" aria-hidden="true" />
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <h2 className="text-xl font-extrabold text-slate-900">Start Shelf Audit</h2>
          <p className="text-sm text-slate-500">
          Walk the shelves and scan each book&apos;s QR code or barcode. The system will compare what you scan against the expected inventory.
          </p>
        </div>

        {/* How it works */}
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">How it works</p>
          {[
            { icon: CheckCircle2, color: 'text-emerald-600', text: 'Matched — scanned and found in catalog' },
            { icon: AlertTriangle, color: 'text-amber-600', text: 'Duplicate — scanned more than once' },
            { icon: XCircle, color: 'text-rose-600', text: 'Not in DB — scanned but unknown to system' },
            { icon: BookOpen, color: 'text-indigo-600', text: 'Missing — in catalog but never scanned' },
          ].map(({ icon: Icon, color, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-slate-700">
              <Icon className={`w-4 h-4 shrink-0 ${color}`} aria-hidden="true" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={startSession}
          className="w-full max-w-sm flex items-center justify-center gap-2 py-4 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg rounded-2xl shadow-xl shadow-violet-500/30 transition-all active:scale-[0.97]"
        >
          <Play className="w-5 h-5" aria-hidden="true" />
          Begin Audit Session
        </button>
      </div>
    )
  }

  // ── SCANNING phase ──────────────────────────────────────────
  if (phase === 'scanning') {
    return (
      <div className="space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> {matchedCount} matched
            </span>
            {duplicateCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5" /> {duplicateCount} dup
              </span>
            )}
            {notInDBCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700">
                <XCircle className="w-3.5 h-3.5" /> {notInDBCount} unknown
              </span>
            )}
          </div>
          <button
            onClick={endSession}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold transition-colors"
          >
            <Square className="w-3.5 h-3.5" aria-hidden="true" />
            End Session
          </button>
        </div>

        {/* Scanner trigger */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {showScanner ? (
            <div className="p-4">
              <QRScanner
                onScanSuccess={handleScan}
                onCancel={() => setShowScanner(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowScanner(true)}
              disabled={lookupPending}
              className="w-full flex flex-col items-center justify-center gap-3 py-10 text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50"
            >
              {lookupPending ? (
                <>
                  <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <p className="text-sm font-semibold">Looking up…</p>
                </>
              ) : (
                <>
                  <ScanLine className="w-10 h-10" aria-hidden="true" />
                  <p className="text-sm font-semibold">Tap to scan next book</p>
                  {lastScanLabel && (
                    <p className="text-xs text-slate-400 max-w-[200px] text-center truncate">Last: {lastScanLabel}</p>
                  )}
                </>
              )}
            </button>
          )}
        </div>

        {/* Running log */}
        {scans.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scan Log ({scans.length})</p>
            </div>
            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {scans.map(entry => (
                <div key={entry.id} className={`flex items-center gap-3 px-5 py-3.5 ${
                  entry.status === 'not_in_db' ? 'bg-rose-50/50' :
                  entry.status === 'duplicate' ? 'bg-amber-50/50' : ''
                }`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{entry.book?.title ?? entry.isbn}</p>
                    {entry.book?.shelf_location && (
                      <p className="text-xs text-indigo-600 mt-0.5">{entry.book.shelf_location}</p>
                    )}
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{entry.isbn}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <StatusBadge status={entry.status} />
                    <p className="text-[10px] text-slate-300">
                      {entry.scannedAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── SUMMARY phase ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-lg font-extrabold text-slate-900 mb-4">Session Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Scanned', value: scans.length, color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: ScanLine },
            { label: 'Matched', value: matchedCount, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
            { label: 'Duplicates', value: duplicateCount, color: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertTriangle },
            { label: 'Not in DB', value: notInDBCount, color: 'bg-rose-50 text-rose-700 border-rose-100', icon: XCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${color}`}>
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-2xl font-extrabold">{value}</span>
              <span className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Missing books */}
      {missingBooks.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" aria-hidden="true" />
            <p className="text-sm font-bold text-rose-700">{missingBooks.length} Missing Book{missingBooks.length !== 1 ? 's' : ''} — Expected on shelf but not scanned</p>
          </div>
          <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto">
            {missingBooks.map(b => (
              <div key={b.id} className="flex items-center gap-3 px-5 py-3.5">
                <BookOpen className="w-4 h-4 text-slate-300 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{b.title}</p>
                  {b.shelf_location && <p className="text-xs text-indigo-600">{b.shelf_location}</p>}
                  {b.isbn && <p className="text-[10px] text-slate-400 font-mono">{b.isbn}</p>}
                </div>
                <span className="text-xs text-slate-400 shrink-0">{b.available_copies} copy</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All scans log (compact) */}
      {scans.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">All Scans ({scans.length})</p>
          </div>
          <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
            {scans.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{entry.book?.title ?? entry.isbn}</p>
                </div>
                <StatusBadge status={entry.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Export Session as CSV
        </button>
        <button
          onClick={resetSession}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Start New Session
        </button>
      </div>
    </div>
  )
}
