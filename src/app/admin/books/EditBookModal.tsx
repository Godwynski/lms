'use client'

import { useState, useActionState, useEffect } from 'react'
import { updateBook } from './actions'
import { Save, X, Edit, AlertCircle, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

interface Book {
  id: string
  title: string
  author: string | null
  isbn: string | null
  publisher: string | null
  publication_year: number | null
  description: string | null
  cover_image_url: string | null
  total_copies: number
  available_copies: number
  ddc_call_number: string | null
  genre: string | null
  page_count: number | null
  language: string | null
}

export default function EditBookModal({ book }: { book: Book }) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(updateBook, null)

  const handleClose = () => {
    setIsOpen(false)
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
        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        title="Edit Book"
      >
        <Edit className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-500" />
                Edit Book
              </h2>
              <button 
                onClick={handleClose} 
                className="p-1 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              
              {/* Success State */}
              {state?.success ? (
                 <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-300">
                   <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                     <CheckCircle2 className="w-8 h-8" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 mb-2">Book Updated!</h3>
                   <p className="text-slate-500 max-w-sm">{state.message}</p>
                 </div>
              ) : (
                <form action={formAction} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <input type="hidden" name="id" value={book.id} />
                  
                  {state?.error && (
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex gap-2 items-start border border-rose-100">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">{state.error}</p>
                    </div>
                  )}

                  <div className="flex gap-6">
                    {/* Cover Preview */}
                    <div className="w-32 shrink-0">
                      {book.cover_image_url ? (
                        <div className="relative w-full aspect-[2/3] rounded-lg shadow-md border border-slate-200 overflow-hidden">
                          <Image 
                            src={book.cover_image_url} 
                            alt="Cover Preview" 
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-[2/3] bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 text-xs text-center p-2">
                          No Cover
                        </div>
                      )}
                    </div>

                    {/* Core Form Fields */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Title</label>
                        <input required name="title" defaultValue={book.title} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Author</label>
                          <input name="author" defaultValue={book.author || ''} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ISBN</label>
                          <input readOnly name="isbn" value={book.isbn || 'N/A'} className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Publisher</label>
                      <input name="publisher" defaultValue={book.publisher || ''} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Year</label>
                      <input type="number" name="publication_year" defaultValue={book.publication_year || ''} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Genre / Category</label>
                      <input name="genre" defaultValue={book.genre || ''} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pages</label>
                      <input type="number" name="page_count" defaultValue={book.page_count || ''} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Language</label>
                      <input name="language" defaultValue={book.language?.toUpperCase() || ''} placeholder="EN" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                    <textarea name="description" rows={3} defaultValue={book.description || ''} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                  </div>

                  {/* Inventory Controls */}
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-4">
                    <h4 className="font-semibold text-indigo-900 text-sm">Inventory Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-indigo-600/80 uppercase tracking-wider mb-1">Total Copies</label>
                        <input 
                          required 
                          type="number" 
                          min={book.total_copies - book.available_copies} 
                          name="total_copies" 
                          defaultValue={book.total_copies} 
                          className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-sm font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                          title="Cannot be less than the number of copies currently checked out"
                        />
                        <p className="text-[10px] text-indigo-500 mt-1">
                          Currently checked out: {book.total_copies - book.available_copies}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-indigo-600/80 uppercase tracking-wider mb-1">DDC Call Number</label>
                        <input name="ddc_call_number" defaultValue={book.ddc_call_number || ''} placeholder="e.g. 813.54" className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                      </div>
                    </div>
                  </div>

                  {/* Submit Actions */}
                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-[2] flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl shadow-sm transition-all"
                    >
                      {isPending ? 'Updating...' : (
                        <>
                          <Save className="w-4 h-4" />
                          Update Book
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
