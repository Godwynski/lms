import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Database } from 'lucide-react'
import DataHubClient from './DataHubClient'

const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

export const metadata = {
  title: 'Data Hub — LMS Admin',
}

export default async function DataHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !STAFF_ROLES.includes(profile.role)) redirect('/')

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-200/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[55%] h-[55%] rounded-full bg-emerald-200/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Database className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Data Hub</h1>
              <p className="text-sm text-slate-500">Bulk import books and export circulation reports</p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Dashboard
          </Link>
        </div>

        <DataHubClient />
      </div>
    </div>
  )
}
