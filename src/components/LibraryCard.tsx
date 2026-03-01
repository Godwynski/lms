'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useRef } from 'react'
import { Printer } from 'lucide-react'

type Props = {
  userId: string
  fullName: string
  studentNumber?: string | null
  role: string
}

/**
 * Generates the QR payload for the student library card.
 * Format: STICAL-LMS:USER:{user_id}:{student_number}
 * Falls back to user_id only if no student number set.
 */
export function buildLibraryCardQRPayload(userId: string, studentNumber?: string | null): string {
  if (studentNumber) {
    return `STICAL-LMS:USER:${userId}:${studentNumber}`
  }
  return `STICAL-LMS:USER:${userId}`
}

export default function LibraryCard({ userId, fullName, studentNumber, role }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const qrPayload = buildLibraryCardQRPayload(userId, studentNumber)

  const handlePrint = () => {
    const printContent = cardRef.current?.innerHTML
    if (!printContent) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Library Card — ${fullName}</title>
          <style>
            body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #f8fafc; }
            .card { background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 24px; width: 320px; text-align: center; }
            .school { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
            .title { font-size: 18px; font-weight: 900; color: #1e293b; margin-bottom: 16px; }
            .qr { display: flex; justify-content: center; margin: 12px 0; }
            .name { font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 12px; }
            .number { font-size: 12px; color: #64748b; font-family: monospace; margin-top: 4px; letter-spacing: 0.05em; }
            .role-badge { display: inline-block; margin-top: 8px; padding: 2px 10px; background: #eff6ff; color: #3b82f6; border-radius: 99px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  return (
    <div className="space-y-3">
      {/* Card */}
      <div
        ref={cardRef}
        className="card bg-white border-2 border-slate-200 rounded-2xl p-5 text-center shadow-sm"
      >
        <p className="school text-[10px] font-bold tracking-widest uppercase text-slate-500">STI College Alabang</p>
        <p className="title text-lg font-black text-slate-900 mb-3">Library Card</p>

        <div className="qr flex justify-center py-2 bg-slate-50 rounded-xl">
          <QRCodeSVG
            value={qrPayload}
            size={148}
            level="M"
            includeMargin={false}
            bgColor="transparent"
            fgColor="#1e293b"
          />
        </div>

        <p className="name font-extrabold text-slate-900 mt-3 text-base">{fullName}</p>
        {studentNumber ? (
          <p className="number font-mono text-xs text-slate-500 mt-1 tabular-nums">Student No: {studentNumber}</p>
        ) : (
          <p className="number text-xs text-amber-500 mt-1 italic">No student number assigned</p>
        )}
        <span className="role-badge inline-block mt-2 px-3 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
          {role.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          Print Card
        </button>
      </div>

      {!studentNumber && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center">
          Ask your librarian to assign your student number for faster checkout.
        </p>
      )}
    </div>
  )
}
