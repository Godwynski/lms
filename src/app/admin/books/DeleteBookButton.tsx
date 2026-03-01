'use client'

import { useState } from 'react'
import { deleteBook } from './actions'
import { Trash2, AlertTriangle } from 'lucide-react'

export default function DeleteBookButton({ bookId, title, canDelete }: { bookId: string, title: string, canDelete: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    const result = await deleteBook(bookId)
    if (result?.error) {
      setError(result.error)
      setIsDeleting(false)
    } else {
      setIsOpen(false)
    }
  }

  if (!canDelete) {
    return (
      <button 
        disabled
        className="p-2 text-slate-300 rounded-lg cursor-not-allowed"
        title="Cannot delete book while copies are checked out"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    )
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        title="Delete Book"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Delete Book?</h3>
              <p className="text-center text-slate-500 mb-6">
                Are you sure you want to permanently remove <span className="font-medium text-slate-800">&quot;{title}&quot;</span> from the catalog? This action cannot be undone.
              </p>

              {error && (
                <div className="mb-6 p-3 bg-rose-50 text-rose-600 rounded-xl text-sm border border-rose-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:bg-rose-400"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
