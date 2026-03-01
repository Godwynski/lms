'use client'

import { useState, useActionState, useEffect } from 'react'
import Image from 'next/image'
import { fetchBookByISBN, addBookToCatalog } from './actions'
import QRScanner from '@/components/QRScanner'
import { Search, Plus, Save, X, BookOpen, AlertCircle, CheckCircle2, ScanLine } from 'lucide-react'

interface BookData {
  isbn: string
  title: string
  author?: string
  publisher?: string
  publication_year?: number
  genre?: string
  page_count?: number
  language?: string
  description?: string
  cover_image_url?: string
}

export default function AddBookModal() {
  const [isOpen, setIsOpen] = useState(false)
  
  // Phase 1: Search Options
  const [isbnInput, setIsbnInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  // Phase 2: Form Data
  const [scannedBook, setScannedBook] = useState<BookData | null>(null)
  
  // Phase 3: Submission Action
  const [state, formAction, isPending] = useActionState(addBookToCatalog, null)

  const handleFetchBook = async (isbnToFetch: string) => {
    setIsFetching(true)
    setFetchError(null)
    setScannedBook(null)
    setIsScanning(false)
    
    // Clean ISBN (remove hyphens)
    const cleanIsbn = isbnToFetch.replace(/-/g, '')
    
    if (!cleanIsbn || cleanIsbn.length < 10) {
      setFetchError('Please enter a valid ISBN-10 or ISBN-13.')
      setIsFetching(false)
      return
    }

    const result = await fetchBookByISBN(cleanIsbn)
    
    if (result.error) {
      setFetchError(result.error)
    } else if (result.success && result.book) {
      setScannedBook(result.book)
    }
    
    setIsFetching(false)
  }
  
  const handleScanSuccess = (decodedText: string) => {
    setIsbnInput(decodedText)
    handleFetchBook(decodedText)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsbnInput('')
    setScannedBook(null)
    setFetchError(null)
    setIsScanning(false)
  }

  // Close modal and reset state on successful submission
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        handleClose()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state])

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        Add New Book
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Add Book to Catalog
              </h2>
              <button 
                onClick={handleClose} 
                className="p-1 rounded-full text-slate-400 hover:bg-slate-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              
              {/* Success State */}
              {state?.success ? (
                 <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-300">
                   <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                     <CheckCircle2 className="w-8 h-8" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 mb-2">Book Added!</h3>
                   <p className="text-slate-500 max-w-sm">{state.message}</p>
                 </div>
              ) : (
                <>
                  {/* Step 1: Search / Scan */}
                  {!scannedBook && (
                    <div className="space-y-6">
                      
                      {isScanning ? (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                          <QRScanner 
                            onScanSuccess={handleScanSuccess} 
                            onCancel={() => setIsScanning(false)} 
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <label className="block text-sm font-semibold text-slate-700">Find by ISBN</label>
                          <div className="flex gap-3">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                              <input 
                                type="text"
                                value={isbnInput}
                                onChange={(e) => setIsbnInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFetchBook(isbnInput)}
                                placeholder="Enter ISBN (e.g. 9780141439518)"
                                spellCheck={false}
                                autoComplete="off"
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-100 rounded-xl transition-all outline-none tabular-nums"
                              />
                            </div>
                            <button 
                              onClick={() => handleFetchBook(isbnInput)}
                              disabled={isFetching || !isbnInput}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                            >
                              {isFetching ? 'Fetching...' : 'Search'}
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-4 py-2">
                            <div className="h-px bg-slate-200 flex-1"></div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">OR</span>
                            <div className="h-px bg-slate-200 flex-1"></div>
                          </div>

                          <button 
                            onClick={() => setIsScanning(true)}
                            className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                          >
                            <ScanLine className="w-5 h-5" aria-hidden="true" />
                            Scan ISBN Barcode with Camera
                          </button>
                        </div>
                      )}

                      {fetchError && (
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex gap-2 items-start text-sm border border-rose-100 animate-in fade-in slide-in-from-top-2">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <p>{fetchError}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Review and Submit Data */}
                  {scannedBook && (
                    <form action={formAction} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      
                      {state?.error && (
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex gap-2 items-start border border-rose-100">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <p className="text-sm font-medium">{state.error}</p>
                        </div>
                      )}

                      <div className="flex gap-6">
                        {/* Cover Preview */}
                        <div className="w-32 shrink-0">
                          {scannedBook.cover_image_url ? (
                            <div className="relative w-full aspect-[2/3] rounded-lg shadow-md border border-slate-200 overflow-hidden bg-slate-100">
                              {/* next/image with unoptimized to support any external book cover domain */}
                              <Image
                                src={scannedBook.cover_image_url!}
                                alt="Cover Preview"
                                fill
                                unoptimized
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-[2/3] bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 text-xs text-center p-2">
                              No Cover Available
                            </div>
                          )}
                          <input type="hidden" name="cover_image_url" value={scannedBook.cover_image_url || ''} />
                        </div>

                        {/* Core Form Fields */}
                        <div className="flex-1 space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Title</label>
                            <input required name="title" defaultValue={scannedBook.title} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Author</label>
                              <input name="author" defaultValue={scannedBook.author} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ISBN</label>
                              <input readOnly name="isbn" value={scannedBook.isbn} className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Publisher</label>
                          <input name="publisher" defaultValue={scannedBook.publisher} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Year</label>
                          <input type="number" name="publication_year" defaultValue={scannedBook.publication_year} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Genre / Category</label>
                          <input name="genre" defaultValue={scannedBook.genre} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pages</label>
                          <input type="number" name="page_count" defaultValue={scannedBook.page_count} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Language</label>
                          <input name="language" defaultValue={scannedBook.language?.toUpperCase()} placeholder="EN" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                        <textarea name="description" rows={3} defaultValue={scannedBook.description} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                      </div>

                      {/* Inventory Controls */}
                      <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-4">
                        <h4 className="font-semibold text-indigo-900 text-sm">Inventory Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-indigo-600/80 uppercase tracking-wider mb-1">Total Copies Received</label>
                            <input required type="number" min="1" name="total_copies" defaultValue={1} className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-sm font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-indigo-600/80 uppercase tracking-wider mb-1">DDC Call Number</label>
                            <input name="ddc_call_number" placeholder="e.g. 813.54" className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                          </div>
                        </div>
                      </div>

                      {/* Submit Actions */}
                      <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setScannedBook(null)}
                          className="flex-1 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="flex-[2] flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl shadow-sm transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        >
                          {isPending ? 'Saving to Catalog...' : (
                            <>
                              <Save className="w-4 h-4" aria-hidden="true" />
                              Save to Catalog
                            </>
                          )}
                        </button>
                      </div>

                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
