'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import QRScanner from '@/components/QRScanner'
import { lookupBookForSelfCheckout, processSelfCheckout } from './actions'
import { Book, AlertCircle, CheckCircle2, ArrowUpFromLine, Hash, ScanLine } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BookData = any

export default function SelfCheckoutClient() {
  const searchParams = useSearchParams()
  const initialIsbn = searchParams.get('isbn')

  const [step, setStep] = useState<1 | 2>(1) // 1: Scan Book (Checkout), 2: Confirm (Checkout)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [book, setBook] = useState<BookData | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isbnInput, setIsbnInput] = useState(initialIsbn || '')
  const [isBookLookupPending, setIsBookLookupPending] = useState(false)

  useEffect(() => {
    if (initialIsbn && step === 1 && !book) {
      handleManualLookup(initialIsbn)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIsbn])

  const handleScanSuccess = async (decodedText: string) => {
    setIsScanning(false)
    setLoading(true)
    setError(null)

    // For simplicity, if It's a QR of STICAL-LMS:BOOK:..., parse it.
    // If it's a raw ISBN from barcode, just use it.
    let searchParam = decodedText
    if (searchParam.startsWith('STICAL-LMS:BOOK:')) {
      const parts = searchParam.split(':')
      searchParam = parts[2] // This handles if QR is encoded this way. But typically we lookup by ISBN in this simplified flow
    }

    try {
      const result = await lookupBookForSelfCheckout(searchParam)
      if (result.error) {
         setError(result.error)
      } else {
         setBook(result.book)
         setStep(2)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred during scanning')
      } else {
        setError('An error occurred during scanning')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleManualLookup = async (overrideIsbn?: string) => {
    const searchIsbn = overrideIsbn || isbnInput

    setIsBookLookupPending(true)
    setError(null)
    try {
      const res = await lookupBookForSelfCheckout(searchIsbn)
      if (res.error) {
        setError(res.error)
      } else { 
        setBook(res.book)
        setStep(2) 
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed lookup.')
      } else {
        setError('Failed lookup.')
      }
    } finally {
      setIsBookLookupPending(false)
    }
  }

  const handleProcessTransaction = async () => {
    setLoading(true)
    setError(null)
    
    try {
      if (!book) return
      const result = await processSelfCheckout(book.id)
      if (result.error) {
        setError(result.error)
      } else {
        showSuccess(result.message || 'Checkout successful!')
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || `Failed to process checkout`)
      } else {
        setError(`Failed to process checkout`)
      }
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => {
      resetFlow()
    }, 4000)
  }

  const resetFlow = () => {
    setStep(1)
    setBook(null)
    setSuccessMsg(null)
    setError(null)
    setIsScanning(false)
    setIsbnInput('')
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 relative z-10 transition-all">
      <div className="backdrop-blur-xl bg-white/80 p-6 sm:p-10 border border-slate-200/50 rounded-[2rem] shadow-xl">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Self-Checkout
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Scan a book&apos;s ISBN barcode or QR code to borrow it instantly.
          </p>
        </div>

        {/* Progress Indicators */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold transition-all ${step >= 1 ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>1</div>
          <div className={`w-16 h-1 rounded flex-shrink-0 transition-all ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold transition-all ${step >= 2 ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>2</div>
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 flex items-start gap-3 animate-in slide-in-from-top-2 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-5 rounded-2xl border border-emerald-200 flex flex-col items-center justify-center text-center gap-3 animate-in zoom-in-95 mb-6 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1">
              <CheckCircle2 className="w-8 h-8 flex-shrink-0" />
            </div>
            <div>
              <span className="font-bold text-lg block">{successMsg}</span>
              <span className="text-sm text-emerald-600/80 mt-1 block">The book has been added to your borrowings.</span>
            </div>
          </div>
        )}

        {/* Scanner Modal Area */}
        {isScanning ? (
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <h3 className="text-center font-semibold text-slate-700 mb-4">
              Scanning Book ISBN / QR...
            </h3>
            <QRScanner 
              onScanSuccess={handleScanSuccess} 
              onCancel={() => setIsScanning(false)} 
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Data Display */}
            <div className="grid grid-cols-1 gap-4">
              {/* Book Card */}
              <div className={`p-5 rounded-2xl border transition-all ${book ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center mb-3">
                  <Book className={`w-5 h-5 mr-2 ${book ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <h4 className={`font-semibold ${book ? 'text-indigo-900' : 'text-slate-500'}`}>Selected Book</h4>
                </div>
                {book ? (
                  <div className="flex items-start">
                    {book.cover_url && (
                      <div className="relative w-12 h-16 shrink-0 rounded shadow shadow-indigo-900/10 mr-4 overflow-hidden">
                        <Image src={book.cover_url} alt="Cover" fill className="object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 line-clamp-1 text-lg">{book.title}</p>
                      <p className="text-sm font-medium text-slate-600 mt-0.5 max-w-full truncate">{book.author}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-1 break-all">ISBN: {book.isbn}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Not scanned yet</p>
                )}
              </div>
            </div>

            {/* Action Area */}
            {!successMsg && (
              <div className="flex justify-center pt-4">
                  <>
                    {step === 1 && (
                      <div className="space-y-4 w-full">
                        <button onClick={() => setIsScanning(true)} disabled={loading} className="w-full flex justify-center items-center py-4 px-6 rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50">
                          <ScanLine className="w-5 h-5 mr-2" />
                          Scan Book Camera
                        </button>
                        {/* Manual fallback: isbn */}
                        <div className="flex items-center gap-3 pt-2">
                          <div className="h-px flex-1 bg-slate-200" />
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">or enter manually</span>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={isbnInput}
                              onChange={(e) => setIsbnInput(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && isbnInput.trim()) {
                                  handleManualLookup()
                                }
                              }}
                              placeholder="Book ISBN"
                              className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm transition-all"
                            />
                          </div>
                          <button
                            disabled={isBookLookupPending || !isbnInput.trim()}
                            onClick={() => handleManualLookup()}
                            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
                          >
                            {isBookLookupPending ? '...' : 'Find'}
                          </button>
                        </div>
                      </div>
                    )}
                    {step === 2 && (
                      <div className="w-full flex space-x-3">
                        <button onClick={resetFlow} disabled={loading} className="w-1/3 py-4 px-6 rounded-2xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold transition-all active:scale-[0.98] disabled:opacity-50">
                          Cancel
                        </button>
                        <button onClick={handleProcessTransaction} disabled={loading} className="w-2/3 flex justify-center items-center py-4 px-6 rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50">
                          Confirm Borrow
                          <ArrowUpFromLine className="w-5 h-5 ml-2" />
                        </button>
                      </div>
                    )}
                  </>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
