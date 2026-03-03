'use client'

import { useState, useRef } from 'react'
import {
  Upload, Download, FileDown, BookOpen, History,
  CheckCircle2, AlertCircle, Loader2, X, Eye, FileText, ChevronRight
} from 'lucide-react'
import { importBooks, type ImportBookRow } from './actions'

// ──────────────────────────────────────────────────────────
// Minimal CSV parser (handles quoted fields with commas/newlines)
// ──────────────────────────────────────────────────────────
function parseCSV(raw: string): ImportBookRow[] {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = values[i]?.trim() ?? '' })
    return {
      title: obj.title || '',
      author: obj.author || '',
      isbn: obj.isbn || '',
      ddc_call_number: obj.ddc_call_number || obj.ddc || '',
      publisher: obj.publisher || '',
      publication_year: obj.publication_year ? Number(obj.publication_year) : null,
      total_copies: obj.total_copies ? Number(obj.total_copies) : 1,
      shelf_location: obj.shelf_location || '',
      category: obj.category || '',
      genre: obj.genre || '',
      language: obj.language || '',
      page_count: obj.page_count ? Number(obj.page_count) : null,
      description: obj.description || '',
    } as ImportBookRow
  }).filter(r => r.title)
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

// ──────────────────────────────────────────────────────────

type UploadState = 'idle' | 'preview' | 'loading' | 'success' | 'error'

export default function DataHubClient() {
  // Import state
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [previewRows, setPreviewRows] = useState<ImportBookRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)

  const handleFilePick = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setImportMessage('Please upload a .csv file.')
      setUploadState('error')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      if (rows.length === 0) {
        setImportMessage('No valid rows found. Make sure your CSV has a "title" column.')
        setUploadState('error')
        return
      }
      setPreviewRows(rows)
      setUploadState('preview')
      setImportMessage('')
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFilePick(file)
  }

  const handleConfirmImport = async () => {
    setUploadState('loading')
    const result = await importBooks(previewRows)
    if (result.error) {
      setImportMessage(result.error)
      setUploadState('error')
    } else {
      setImportMessage(`Successfully imported ${result.imported} book${result.imported !== 1 ? 's' : ''}!`)
      setUploadState('success')
      setPreviewRows([])
    }
  }

  const resetImport = () => {
    setUploadState('idle')
    setPreviewRows([])
    setFileName('')
    setImportMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const PREVIEW_COLS: { key: keyof ImportBookRow; label: string }[] = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'publication_year', label: 'Year' },
    { key: 'total_copies', label: 'Copies' },
    { key: 'shelf_location', label: 'Shelf' },
    { key: 'category', label: 'Category' },
  ]

  return (
    <div className="space-y-8">

      {/* ── CSV IMPORT ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Upload className="w-5 h-5 text-indigo-600" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Import Books via CSV</h2>
            <p className="text-xs text-slate-500 mt-0.5">Upload a .csv file to bulk-add or update books in the catalog</p>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Template hint */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span>Required column: <code className="font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">title</code>. Optional: <code className="bg-slate-200 px-1.5 py-0.5 rounded">author</code>, <code className="bg-slate-200 px-1.5 py-0.5 rounded">isbn</code>, <code className="bg-slate-200 px-1.5 py-0.5 rounded">total_copies</code>, <code className="bg-slate-200 px-1.5 py-0.5 rounded">shelf_location</code>, <code className="bg-slate-200 px-1.5 py-0.5 rounded">category</code>, <code className="bg-slate-200 px-1.5 py-0.5 rounded">publication_year</code>, <code className="bg-slate-200 px-1.5 py-0.5 rounded">ddc_call_number</code>. Rows with matching ISBN will be <strong>updated</strong>.
            </span>
          </div>

          {/* Drop zone */}
          {(uploadState === 'idle' || uploadState === 'error') && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Click or drag to upload CSV file"
              onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Upload className="w-6 h-6 text-indigo-400" aria-hidden="true" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-700">Drop your CSV file here</p>
                <p className="text-sm text-slate-400 mt-1">or <span className="text-indigo-600 font-semibold">click to browse</span></p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                aria-hidden="true"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFilePick(f) }}
              />
            </div>
          )}

          {/* Error feedback */}
          {uploadState === 'error' && importMessage && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              {importMessage}
            </div>
          )}

          {/* Success feedback */}
          {uploadState === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" aria-hidden="true" />
              </div>
              <p className="text-base font-extrabold text-slate-900">{importMessage}</p>
              <button onClick={resetImport} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Import Another File
              </button>
            </div>
          )}

          {/* Preview table */}
          {uploadState === 'preview' && previewRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                  <span className="text-sm font-bold text-slate-800">
                    Preview — <span className="text-indigo-600">{previewRows.length} row{previewRows.length !== 1 ? 's' : ''}</span> from <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{fileName}</code>
                  </span>
                </div>
                <button
                  onClick={resetImport}
                  aria-label="Cancel import"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0">
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wide">#</th>
                        {PREVIEW_COLS.map(c => (
                          <th key={c.key} className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {previewRows.slice(0, 50).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                          {PREVIEW_COLS.map(c => (
                            <td key={c.key} className="px-3 py-2 text-slate-700 max-w-[160px] truncate">
                              {String(row[c.key] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewRows.length > 50 && (
                  <p className="text-xs text-slate-400 text-center py-2 bg-slate-50 border-t border-slate-100">
                    Showing first 50 of {previewRows.length} rows. All rows will be imported.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={resetImport}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  Import {previewRows.length} Book{previewRows.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {uploadState === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-600">Importing {previewRows.length} books…</p>
            </div>
          )}
        </div>
      </section>

      {/* ── EXPORTS ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Download className="w-5 h-5 text-emerald-600" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Export Data</h2>
            <p className="text-xs text-slate-500 mt-0.5">Download catalog and circulation reports as CSV</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Book catalog export */}
          <a
            href="/admin/data-hub/export/books"
            download
            className="group flex items-center gap-4 p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/10 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 transition-colors">
              <BookOpen className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900">Book Catalog</p>
              <p className="text-xs text-slate-500 mt-0.5">All books with shelf, copies, and metadata</p>
            </div>
            <FileDown className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" aria-hidden="true" />
          </a>

          {/* Active borrowings export */}
          <a
            href="/admin/data-hub/export/borrowings"
            download
            className="group flex items-center gap-4 p-5 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/10 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 transition-colors">
              <History className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900">Active Borrowings</p>
              <p className="text-xs text-slate-500 mt-0.5">Borrowed, overdue, and pending records</p>
            </div>
            <FileDown className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" aria-hidden="true" />
          </a>

        </div>
      </section>

    </div>
  )
}
