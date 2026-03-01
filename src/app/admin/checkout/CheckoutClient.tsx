'use client'

import { useState } from 'react'
import Image from 'next/image'
import QRScanner from '@/components/QRScanner'
import { lookupUser, lookupOrAddBook, processCheckout, processReturn, lookupUserByStudentNumber } from './actions'
import { UserCheck, Book, AlertCircle, CheckCircle2, CornerDownLeft, ArrowUpFromLine, Hash } from 'lucide-react'

interface Borrower {
  id: string
  full_name: string | null
  role: string
}

interface BookInfo {
  id: string
  isbn: string
  title: string
  author?: string | null
  cover_url?: string | null
}

export default function CheckoutClient() {
  const [mode, setMode] = useState<'checkout' | 'return'>('checkout')
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Scan user (Checkout) OR Scan Book (Return), 2: Scan book (Checkout) OR Confirm (Return), 3: Confirm (Checkout)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [book, setBook] = useState<BookInfo | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [studentNumberInput, setStudentNumberInput] = useState('')
  const [isStudentLookupPending, setIsStudentLookupPending] = useState(false)

  const toggleMode = (newMode: 'checkout' | 'return') => {
    setMode(newMode)
    resetFlow()
  }

  const handleScanSuccess = async (decodedText: string) => {
    setIsScanning(false)
    setLoading(true)
    setError(null)

    try {
      if (mode === 'checkout') {
        if (step === 1) {
          // Look up user
          const result = await lookupUser(decodedText)
          if (result.error) {
            setError(result.error)
          } else {
            setBorrower(result.user ?? null)
            setStep(2)
          }
        } else if (step === 2) {
          // Look up book by ISBN
          const result = await lookupOrAddBook(decodedText)
          if (result.error) {
             setError(result.error)
          } else {
             setBook(result.book)
             if (result.isNew) {
               console.log("New book registered to the library database")
             }
             setStep(3)
          }
        }
      } else if (mode === 'return') {
        if (step === 1) {
          // Look up book by ISBN (for return, we just need ISBN ideally handled by the processReturn action, but we lookup the book for display)
          // Actually, we could directly process the return, but looking it up first lets us confirm.
          // Re-using lookupOrAddBook is fine for getting visually the book data.
          const result = await lookupOrAddBook(decodedText)
          if (result.error) {
             setError(result.error)
          } else {
             setBook(result.book)
             setStep(2)
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during scanning')
    } finally {
      setLoading(false)
    }
  }

  const handleProcessTransaction = async () => {
    setLoading(true)
    setError(null)
    
    if (!borrower || !book) return
    try {
      if (mode === 'checkout') {
        const result = await processCheckout(borrower.id, book.id)
        if (result.error) {
          setError(result.error)
        } else {
          showSuccess(result.message || 'Checkout successful!')
        }
      } else {
        const result = await processReturn(book.isbn)
        if (result.error) {
           setError(result.error)
        } else {
           showSuccess(result.message || 'Return successful!')
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to process ${mode}`)
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => {
      resetFlow()
    }, 3000)
  }

  const resetFlow = () => {
    setStep(1)
    setBorrower(null)
    setBook(null)
    setSuccessMsg(null)
    setError(null)
    setIsScanning(false)
    setStudentNumberInput('')
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 relative z-10 transition-all">
      
      {/* Mode Toggle */}
      <div className="flex bg-slate-200/50 backdrop-blur-md p-1.5 rounded-2xl md:w-max mx-auto border border-slate-200 shadow-sm">
        <button
          onClick={() => toggleMode('checkout')}
          className={`flex-1 md:w-32 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
            mode === 'checkout' 
              ? 'bg-white text-indigo-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          Checkout
        </button>
        <button
          onClick={() => toggleMode('return')}
          className={`flex-1 md:w-32 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
            mode === 'return' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          Return
        </button>
      </div>

      <div className="backdrop-blur-xl bg-white/80 p-6 sm:p-10 border border-slate-200/50 rounded-[2rem] shadow-xl">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {mode === 'checkout' ? 'Checkout Kiosk' : 'Return Kiosk'}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {mode === 'checkout' 
              ? 'Scan Borrower ID, then scan Book ISBN' 
              : 'Scan Book ISBN to return it to inventory'}
          </p>
        </div>

        {/* Progress Indicators */}
        {mode === 'checkout' ? (
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold transition-all ${step >= 1 ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>1</div>
            <div className={`w-16 h-1 rounded flex-shrink-0 transition-all ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold transition-all ${step >= 2 ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>2</div>
            <div className={`w-16 h-1 rounded flex-shrink-0 transition-all ${step >= 3 ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold transition-all ${step >= 3 ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400'}`}>3</div>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold transition-all ${step >= 1 ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400'}`}>1</div>
            <div className={`w-16 h-1 rounded flex-shrink-0 transition-all ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold transition-all ${step >= 2 ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400'}`}>2</div>
          </div>
        )}

        {/* Error / Success Messages */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 flex items-start gap-3 animate-in slide-in-from-top-2 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm border border-emerald-100 flex items-center gap-3 animate-in zoom-in-95 mb-6">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <span className="font-semibold text-lg">{successMsg}</span>
          </div>
        )}

        {/* Scanner Modal Area */}
        {isScanning ? (
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <h3 className="text-center font-semibold text-slate-700 mb-4">
              {mode === 'checkout' && step === 1 ? 'Scanning Library Card QR...' : 'Scanning Book ISBN Barcode...'}
            </h3>
            <QRScanner 
              onScanSuccess={handleScanSuccess} 
              onCancel={() => setIsScanning(false)} 
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Data Display */}
            <div className={`grid grid-cols-1 ${mode === 'checkout' ? 'md:grid-cols-2' : ''} gap-4`}>
              {/* Borrower Card (Only Checkout) */}
              {mode === 'checkout' && (
                <div className={`p-5 rounded-2xl border transition-all ${borrower ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center mb-3">
                    <UserCheck className={`w-5 h-5 mr-2 ${borrower ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <h4 className={`font-semibold ${borrower ? 'text-indigo-900' : 'text-slate-500'}`}>Borrower</h4>
                  </div>
                  {borrower ? (
                    <div>
                      <p className="font-bold text-slate-800">{borrower.full_name}</p>
                      <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{borrower.role}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Not identified yet</p>
                  )}
                </div>
              )}

              {/* Book Card */}
              <div className={`p-5 rounded-2xl border transition-all ${book ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center mb-3">
                  <Book className={`w-5 h-5 mr-2 ${book ? 'text-amber-600' : 'text-slate-400'}`} />
                  <h4 className={`font-semibold ${book ? 'text-amber-900' : 'text-slate-500'}`}>Book</h4>
                </div>
                {book ? (
                  <div className="flex items-start">
                    {book.cover_url && (
                      <div className="relative w-10 h-14 mr-3 flex-shrink-0">
                        <Image src={book.cover_url} alt="Cover" fill unoptimized className="object-cover rounded shadow shadow-amber-900/10" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-800 line-clamp-1">{book.title}</p>
                      <p className="text-xs text-slate-600 mt-1">{book.author}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">ISBN: {book.isbn}</p>
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
                {mode === 'checkout' ? (
                  <>
                    {step === 1 && (
                      <div className="space-y-3 w-full">
                        <button onClick={() => setIsScanning(true)} disabled={loading} className="w-full flex justify-center items-center py-4 px-6 rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50">
                          Scan Library Card QR
                        </button>
                        {/* Manual fallback: student number */}
                        <div className="flex items-center gap-3 pt-1">
                          <div className="h-px flex-1 bg-slate-200" />
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">or enter manually</span>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={studentNumberInput}
                              onChange={(e) => setStudentNumberInput(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && studentNumberInput.trim()) {
                                  setIsStudentLookupPending(true)
                                  setError(null)
                                  const res = await lookupUserByStudentNumber(studentNumberInput)
                                  setIsStudentLookupPending(false)
                                  if (res.error) setError(res.error)
                                  else { setBorrower(res.user ?? null); setStep(2) }
                                }
                              }}
                              placeholder="Student number (e.g. 2024-0001-MNL)"
                              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm transition-all"
                            />
                          </div>
                          <button
                            disabled={isStudentLookupPending || !studentNumberInput.trim()}
                            onClick={async () => {
                              setIsStudentLookupPending(true)
                              setError(null)
                              const res = await lookupUserByStudentNumber(studentNumberInput)
                              setIsStudentLookupPending(false)
                              if (res.error) setError(res.error)
                              else { setBorrower(res.user ?? null); setStep(2) }
                            }}
                            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
                          >
                            {isStudentLookupPending ? '...' : 'Find'}
                          </button>
                        </div>
                      </div>
                    )}
                    {step === 2 && (
                      <button onClick={() => setIsScanning(true)} disabled={loading} className="w-full flex justify-center items-center py-4 px-6 rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50">
                        Scan Book ISBN
                      </button>
                    )}
                    {step === 3 && (
                      <div className="w-full flex space-x-3">
                        <button onClick={resetFlow} disabled={loading} className="w-1/3 py-4 px-6 rounded-2xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold transition-all active:scale-[0.98] disabled:opacity-50">
                          Cancel
                        </button>
                        <button onClick={handleProcessTransaction} disabled={loading} className="w-2/3 flex justify-center items-center py-4 px-6 rounded-2xl text-white bg-emerald-600 hover:bg-emerald-700 text-lg font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50">
                          Confirm Checkout
                          <ArrowUpFromLine className="w-5 h-5 ml-2" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {step === 1 && (
                      <button onClick={() => setIsScanning(true)} disabled={loading} className="w-full flex justify-center items-center py-4 px-6 rounded-2xl text-white bg-emerald-600 hover:bg-emerald-700 text-lg font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50">
                        Scan Book ISBN to Return
                      </button>
                    )}
                    {step === 2 && (
                      <div className="w-full flex space-x-3">
                        <button onClick={resetFlow} disabled={loading} className="w-1/3 py-4 px-6 rounded-2xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold transition-all active:scale-[0.98] disabled:opacity-50">
                          Cancel
                        </button>
                        <button onClick={handleProcessTransaction} disabled={loading} className="w-2/3 flex justify-center items-center py-4 px-6 rounded-2xl text-white bg-emerald-600 hover:bg-emerald-700 text-lg font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50">
                          Process Return
                          <CornerDownLeft className="w-5 h-5 ml-2" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Kiosk Tools */}
        <div className="flex justify-center pt-8 border-t border-slate-100 mt-8">
          <button onClick={resetFlow} className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors">
            Reset Kiosk
          </button>
        </div>
      </div>
    </div>
  )
}
