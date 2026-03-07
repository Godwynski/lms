'use client'

import { useState } from 'react'
import { deleteBook } from './actions'
import { Trash2 } from 'lucide-react'
import { ConfirmDelete, ErrorAlert, SuccessAlert } from '@/lib/swal'

export default function DeleteBookButton({ bookId, title, canDelete }: { bookId: string, title: string, canDelete: boolean }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    const isConfirmed = await ConfirmDelete(`"${title}"`)
    if (!isConfirmed.isConfirmed) return

    setIsDeleting(true)
    const result = await deleteBook(bookId)
    setIsDeleting(false)
    if (result?.error) {
      ErrorAlert('Deletion Failed', result.error)
    } else {
      SuccessAlert('Deleted Successfully')
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
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className={`p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
      title="Delete Book"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
