'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, BookOpenText, GraduationCap, Calendar, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createThesis, updateThesis, deleteThesis } from './actions'
import type { Thesis } from '@/app/theses/ThesisClient'

type Props = {
  theses: Thesis[]
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

const emptyForm = {
  title: '',
  author: '',
  course: '',
  publication_year: '',
  abstract: '',
  pdf_url: '',
}

export default function ThesesAdminClient({ theses: initialTheses }: Props) {
  const [theses, setTheses] = useState(initialTheses)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Thesis | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formState, setFormState] = useState<FormState>('idle')
  const [formMessage, setFormMessage] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setFormState('idle')
    setFormMessage('')
    setShowForm(true)
  }

  const openEdit = (t: Thesis) => {
    setEditTarget(t)
    setForm({
      title: t.title,
      author: t.author,
      course: t.course || '',
      publication_year: t.publication_year?.toString() || '',
      abstract: t.abstract || '',
      pdf_url: t.pdf_url || '',
    })
    setFormState('idle')
    setFormMessage('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState('loading')
    setFormMessage('')

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))

    const result = editTarget
      ? await updateThesis(editTarget.id, fd)
      : await createThesis(fd)

    if (result.error) {
      setFormState('error')
      setFormMessage(result.error)
      return
    }

    setFormState('success')
    setFormMessage(editTarget ? 'Thesis updated!' : 'Thesis added!')
    // Optimistic update
    if (editTarget) {
      setTheses(prev => prev.map(t => t.id === editTarget.id ? {
        ...t,
        title: form.title,
        author: form.author,
        course: form.course || null,
        publication_year: form.publication_year ? Number(form.publication_year) : null,
        abstract: form.abstract || null,
        pdf_url: form.pdf_url || null,
      } : t))
    } else {
      // Reload via router would be ideal, but for now close and let server refresh
    }
    setTimeout(() => {
      setShowForm(false)
      setFormState('idle')
      setFormMessage('')
    }, 1200)
  }

  const handleDelete = async (id: string) => {
    setDeleteLoading(true)
    const result = await deleteThesis(id)
    setDeleteLoading(false)
    if (result.error) {
      alert(`Delete failed: ${result.error}`)
    } else {
      setTheses(prev => prev.filter(t => t.id !== id))
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="space-y-5">

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{theses.length} research paper{theses.length !== 1 ? 's' : ''} in the database</p>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl shadow-md shadow-violet-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Thesis
        </button>
      </div>

      {/* Thesis Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {theses.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-slate-400 gap-3">
            <BookOpenText className="w-10 h-10 text-slate-200" aria-hidden="true" />
            <p className="font-semibold text-slate-600">No theses yet</p>
            <p className="text-sm">Click &ldquo;Add Thesis&rdquo; to upload the first research paper.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Title</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Author</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Course</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Year</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">PDF</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {theses.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-900 max-w-[200px] truncate">{t.title}</td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-[140px] truncate">{t.author}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {t.course ? (
                        <span className="text-xs font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                          {t.course}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                      {t.publication_year ? (
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" aria-hidden="true" />{t.publication_year}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {t.pdf_url ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">PDF ✓</span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">No PDF</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(t)}
                          aria-label={`Edit ${t.title}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(t.id)}
                          aria-label={`Delete ${t.title}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="thesis-form-title">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
              <h2 id="thesis-form-title" className="text-base font-extrabold text-slate-900">
                {editTarget ? 'Edit Thesis' : 'Add New Thesis'}
              </h2>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="thesis-title" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Title <span className="text-rose-500">*</span></label>
                <input
                  id="thesis-title"
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                  placeholder="e.g. Smart Library System using IoT"
                />
              </div>
              {/* Author */}
              <div>
                <label htmlFor="thesis-author" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Author <span className="text-rose-500">*</span></label>
                <input
                  id="thesis-author"
                  type="text"
                  required
                  value={form.author}
                  onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                  placeholder="e.g. Juan Dela Cruz"
                />
              </div>
              {/* Course + Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="thesis-course" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Course</label>
                  <input
                    id="thesis-course"
                    type="text"
                    value={form.course}
                    onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                    placeholder="e.g. BSIT"
                  />
                </div>
                <div>
                  <label htmlFor="thesis-year" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Year</label>
                  <input
                    id="thesis-year"
                    type="number"
                    min="1990"
                    max={new Date().getFullYear()}
                    value={form.publication_year}
                    onChange={e => setForm(f => ({ ...f, publication_year: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                    placeholder={new Date().getFullYear().toString()}
                  />
                </div>
              </div>
              {/* Abstract */}
              <div>
                <label htmlFor="thesis-abstract" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Abstract</label>
                <textarea
                  id="thesis-abstract"
                  rows={4}
                  value={form.abstract}
                  onChange={e => setForm(f => ({ ...f, abstract: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white resize-none"
                  placeholder="Brief summary of the research paper…"
                />
              </div>
              {/* PDF URL */}
              <div>
                <label htmlFor="thesis-pdf" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">PDF URL</label>
                <input
                  id="thesis-pdf"
                  type="url"
                  value={form.pdf_url}
                  onChange={e => setForm(f => ({ ...f, pdf_url: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white font-mono"
                  placeholder="https://drive.google.com/…"
                />
                <p className="text-xs text-slate-400 mt-1">Paste a Google Drive, Dropbox, or direct PDF link.</p>
              </div>

              {/* Feedback */}
              {formMessage && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
                  formState === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {formState === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {formMessage}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={formState === 'loading' || formState === 'success'}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all active:scale-95"
              >
                {formState === 'loading' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : formState === 'success' ? (
                  <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                ) : (
                  <><GraduationCap className="w-4 h-4" /> {editTarget ? 'Update Thesis' : 'Add Thesis'}</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-150">
            <h3 id="delete-confirm-title" className="font-extrabold text-slate-900 text-base mb-2">Delete thesis?</h3>
            <p className="text-sm text-slate-500 mb-5">This action cannot be undone. The thesis will be permanently removed from the database.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
