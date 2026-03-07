'use client'

import { useState } from 'react'
import { requestReturn } from './dashboardActions'
import { RotateCcw } from 'lucide-react'
import { ConfirmAction } from '@/lib/swal'

export default function ReturnButton({ recordId }: { recordId: string }) {
  const [loading, setLoading] = useState(false)

  const handleReturn = async () => {
    const isConfirmed = await ConfirmAction('Request Return?', 'Are you sure you want to request a return for this book?', 'Yes, request return')
    if (!isConfirmed.isConfirmed) return

    setLoading(true)
    await requestReturn(recordId)
    // We don't need to unset loading; the page will refresh via revalidatePath
  }

  return (
    <button
      onClick={handleReturn}
      disabled={loading}
      className={`mt-2 flex w-full items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
        loading 
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
          : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95'
      }`}
    >
      <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
      {loading ? 'Requesting...' : 'Request Return'}
    </button>
  )
}
