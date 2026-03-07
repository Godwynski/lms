import Link from 'next/link'
import { ArrowLeft, BookOpenText } from 'lucide-react'
import ThesisLoader from './ThesisLoader'

export const metadata = {
  title: 'Thesis Explorer — STI College Alabang LMS',
  description: 'Browse and read school research papers and thesis papers from STI College Alabang.',
}

export default function ThesisPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-violet-500/30">
      {/* Background blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-200/30 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <BookOpenText className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Thesis Explorer</h1>
              <p className="text-sm text-slate-500 font-medium">
                Research papers from STI College Alabang
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Dashboard
          </Link>
        </div>

        {/* Data is now sourced from the local PowerSync SQLite database */}
        <ThesisLoader />
      </div>
    </div>
  )
}

