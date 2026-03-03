'use client'

import { useState, useMemo } from 'react'
import { Search, X, BookOpenText, GraduationCap, Calendar, FileText, ExternalLink } from 'lucide-react'

export type Thesis = {
  id: string
  title: string
  author: string
  course?: string | null
  publication_year?: number | null
  abstract?: string | null
  pdf_url?: string | null
  created_at: string
}

type Props = {
  theses: Thesis[]
}

export default function ThesisClient({ theses }: Props) {
  const [query, setQuery] = useState('')
  const [selectedThesis, setSelectedThesis] = useState<Thesis | null>(null)
  const [courseFilter, setCourseFilter] = useState('All')

  // Derive unique courses for filter
  const courses = useMemo(() => {
    const set = new Set(theses.map(t => t.course).filter(Boolean) as string[])
    return ['All', ...Array.from(set).sort()]
  }, [theses])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return theses.filter(t => {
      const matchQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q) ||
        t.course?.toLowerCase().includes(q) ||
        t.abstract?.toLowerCase().includes(q)
      const matchCourse = courseFilter === 'All' || t.course === courseFilter
      return matchQuery && matchCourse
    })
  }, [theses, query, courseFilter])

  return (
    <div className="space-y-6">

      {/* ── Search + Course filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title, author, or course…"
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition-all"
            aria-label="Search theses"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <select
          value={courseFilter}
          onChange={e => setCourseFilter(e.target.value)}
          aria-label="Filter by course"
          className="px-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
        >
          {courses.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Results count ── */}
      <p className="text-sm text-slate-500 font-medium">
        {filtered.length === theses.length
          ? `${theses.length} research papers`
          : `${filtered.length} of ${theses.length} papers`}
      </p>

      {/* ── Thesis Grid ── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(thesis => (
            <button
              key={thesis.id}
              onClick={() => setSelectedThesis(thesis)}
              className="text-left bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-lg hover:shadow-violet-500/10 hover:border-violet-200 transition-all group flex flex-col gap-3"
            >
              {/* Icon + year */}
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 group-hover:bg-violet-600 transition-colors">
                  <BookOpenText className="w-5 h-5 text-violet-600 group-hover:text-white transition-colors" aria-hidden="true" />
                </div>
                {thesis.publication_year && (
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg shrink-0">
                    {thesis.publication_year}
                  </span>
                )}
              </div>

              {/* Title */}
              <p className="font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">
                {thesis.title}
              </p>

              {/* Author + Course */}
              <div className="space-y-1 mt-auto">
                <p className="text-sm text-slate-600 font-medium flex items-center gap-1.5 truncate">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  {thesis.author}
                </p>
                {thesis.course && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                    {thesis.course}
                  </span>
                )}
              </div>

              {/* Abstract preview */}
              {thesis.abstract && (
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed border-t border-slate-50 pt-3 mt-1">
                  {thesis.abstract}
                </p>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center text-slate-500 bg-white rounded-3xl border border-slate-100">
          <BookOpenText className="w-10 h-10 text-slate-300 mb-3" aria-hidden="true" />
          <p className="font-semibold text-slate-700">No theses found</p>
          <p className="text-sm mt-1">Try a different search or course filter.</p>
          {(query || courseFilter !== 'All') && (
            <button
              onClick={() => { setQuery(''); setCourseFilter('All') }}
              className="mt-4 text-sm font-bold text-violet-600 hover:text-violet-800"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Thesis Detail Modal ── */}
      {selectedThesis && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="thesis-modal-title">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setSelectedThesis(null)}
          />
          <div className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-start justify-between gap-3 rounded-t-3xl sm:rounded-t-3xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <BookOpenText className="w-5 h-5 text-violet-600" aria-hidden="true" />
                </div>
                <p className="text-xs font-bold text-violet-600 uppercase tracking-wider">Research Paper</p>
              </div>
              <button
                onClick={() => setSelectedThesis(null)}
                aria-label="Close"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-5">
              {/* Title & meta */}
              <div>
                <h2 id="thesis-modal-title" className="text-xl font-extrabold text-slate-900 leading-tight">{selectedThesis.title}</h2>
                <p className="text-base font-semibold text-violet-600 mt-1">{selectedThesis.author}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedThesis.course && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">
                      <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                      {selectedThesis.course}
                    </span>
                  )}
                  {selectedThesis.publication_year && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                      {selectedThesis.publication_year}
                    </span>
                  )}
                </div>
              </div>

              {/* Abstract */}
              {selectedThesis.abstract && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    Abstract
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedThesis.abstract}</p>
                </div>
              )}

              {/* PDF Viewer */}
              {selectedThesis.pdf_url ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Document</h3>
                    <a
                      href={selectedThesis.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-800"
                    >
                      Open in new tab <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </div>
                  <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50" style={{ height: '480px' }}>
                    <iframe
                      src={selectedThesis.pdf_url}
                      title={`PDF: ${selectedThesis.title}`}
                      className="w-full h-full"
                      allow="fullscreen"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700 font-medium">
                  <FileText className="w-5 h-5 shrink-0" aria-hidden="true" />
                  No PDF available for this paper. Please visit the library for a physical copy.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
