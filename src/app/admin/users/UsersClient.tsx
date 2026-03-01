'use client'

import { useState, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { adminCreateUser, adminUpdateUserRole, adminDeleteUser, adminUpdateStudentNumber } from './actions'
import { extractStudentNumberFromEmail } from '@/lib/email-utils'
import { UserPlus, Save, AlertCircle, X, CheckCircle2, MoreVertical, ShieldAlert, Trash2, Hash, Sparkles } from 'lucide-react'


// This defines the shape of the user profiles we fetch
type Profile = {
  id: string
  email: string
  full_name: string | null
  role: string
  student_number?: string | null
  created_at?: string
  last_sign_in_at?: string | null
}

export default function UsersClient({ profiles, currentUserRole }: { profiles: Profile[], currentUserRole: string }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [studentNumberInput, setStudentNumberInput] = useState('')
  const [isStudentNumPending, setIsStudentNumPending] = useState(false)
  const [createEmailInput, setCreateEmailInput] = useState('')
  const autoStudentNum = createEmailInput ? extractStudentNumberFromEmail(createEmailInput) : null

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    setError(null)
    setSuccess(null)

    const result = await adminCreateUser(formData)

    if (result.error) {
      setError(result.error)
    } else if (result.success) {
      setSuccess(result.message || 'User created')
      setIsAdding(false)
      // Form fields will reset when unmounted
    }
    
    setIsPending(false)
  }

  const handleUpdateRole = async (formData: FormData) => {
    if (!editingUser) return
    
    const newRole = formData.get('role') as string
    if (newRole !== editingUser.role) {
      if (!confirm(`Are you sure you want to change this user's role to ${newRole.replace(/_/g, ' ')}? This affects their system permissions.`)) {
        return
      }
    }

    setIsPending(true)
    setError(null)
    setSuccess(null)

    const result = await adminUpdateUserRole(editingUser.id, newRole)

    if (result.error) {
      setError(result.error)
    } else if (result.success) {
      setSuccess(result.message || 'Role updated')
      setEditingUser(null)
    }
    
    setIsPending(false)
  }

  const handleDelete = async () => {
    if (!editingUser) return
    if (!confirm(`Are you sure you want to permanently delete ${editingUser.full_name || 'this user'}? This cannot be undone.`)) return
    
    setIsPending(true)
    setError(null)
    setSuccess(null)

    const result = await adminDeleteUser(editingUser.id)

    if (result.error) {
      setError(result.error)
    } else if (result.success) {
      setSuccess(result.message || 'User deleted')
      setEditingUser(null)
    }
    
    setIsPending(false)
  }

  const handleSetStudentNumber = async () => {
    if (!editingUser || !studentNumberInput.trim()) return
    setIsStudentNumPending(true)
    setError(null)
    const result = await adminUpdateStudentNumber(editingUser.id, studentNumberInput)
    setIsStudentNumPending(false)
    if (result.error) setError(result.error)
    else { setSuccess(result.message || 'Student number updated'); setEditingUser(null) }
  }

  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: profiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 73,
    overscan: 10,
  })

  return (

    <div className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Users</h1>
          <p className="text-slate-500 font-medium mt-1">Manage all library staff and borrowers</p>
        </div>
        
        {['super_admin', 'librarian'].includes(currentUserRole) && !isAdding && !editingUser && (
          <button
            onClick={() => { setIsAdding(true); setError(null); setSuccess(null); }}
            className="group flex items-center px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/30 transition active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 outline-none"
          >
            <UserPlus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" aria-hidden="true" />
            Create User
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div role="alert" aria-live="polite" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 animate-in slide-in-from-top-2">
           <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
           <span className="font-medium text-sm leading-relaxed">{error}</span>
        </div>
      )}
      {success && (
        <div role="status" aria-live="polite" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-3 animate-in fade-in">
           <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
           <span className="font-medium text-sm">{success}</span>
        </div>
      )}

      {/* Add User Form Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-500" aria-hidden="true" />
                Add New Account
              </h2>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-slate-500 outline-none"
                disabled={isPending}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            
            <form action={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="create-full-name" className="text-sm font-semibold text-slate-700">Full Name</label>
                  <input id="create-full-name" required type="text" name="full_name" autoComplete="name" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 outline-none transition placeholder:text-slate-400" placeholder="Jane Doe" disabled={isPending} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="create-email" className="text-sm font-semibold text-slate-700">Email Address (Login)</label>
                  <input
                    id="create-email"
                    required
                    type="email"
                    name="email"
                    autoComplete="email"
                    spellCheck={false}
                    value={createEmailInput}
                    onChange={(e) => setCreateEmailInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 outline-none transition placeholder:text-slate-400"
                    placeholder="lastname.id@alabang.sti.edu.ph"
                    disabled={isPending}
                  />
                  {/* Live student number detection */}
                  {createEmailInput && (
                    autoStudentNum ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        <Sparkles className="w-3 h-3 shrink-0" aria-hidden="true" />
                        Student number auto-detected: <span className="font-mono font-bold ml-1 tabular-nums">{autoStudentNum}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Hash className="w-3 h-3" aria-hidden="true" /> Non-STI email — assign student number manually after creation.
                      </p>
                    )
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="create-password" className="text-sm font-semibold text-slate-700">Temporary Password</label>
                  <input id="create-password" required type="password" name="password" autoComplete="new-password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 outline-none transition placeholder:text-slate-400" placeholder="••••••••" disabled={isPending} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="create-role" className="text-sm font-semibold text-slate-700">Account Role</label>
                  <select id="create-role" name="role" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 outline-none transition bg-white font-medium text-slate-800 cursor-pointer" disabled={isPending}>
                    <option value="borrower">Borrower (Student)</option>
                    <option value="circulation_assistant">Circulation Assistant</option>
                    <option value="librarian">Librarian</option>
                    <option value="super_admin">System Administrator (Super Admin)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-xl text-xs text-slate-600 space-y-2 border border-slate-100">
                 <p><span className="font-semibold text-slate-700">Borrower:</span> Standard access to search catalog</p>
                 <p><span className="font-semibold text-slate-700">Circulation:</span> Can process checkouts and returns</p>
                 <p><span className="font-semibold text-slate-700">Librarian:</span> Manage catalog and basic users</p>
                 <p><span className="font-semibold text-rose-600">Super Admin:</span> Full system control and role management</p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="group flex items-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold transition shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 outline-none"
                >
                  {isPending ? 'Provisioning…' : (
                    <>
                      <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" aria-hidden="true" />
                Manage Roles & Access
              </h2>
              <button 
                type="button" 
                onClick={() => setEditingUser(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-slate-500 outline-none"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* User info header */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center gap-4">
                <div className="overflow-hidden">
                  <h3 className="font-bold text-slate-900 truncate">{editingUser.full_name || 'Unnamed User'}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{editingUser.email}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0
                  ${editingUser.role === 'super_admin' ? 'bg-rose-100 text-rose-700' : ''}
                  ${editingUser.role === 'librarian' ? 'bg-indigo-100 text-indigo-700' : ''}
                  ${editingUser.role === 'circulation_assistant' ? 'bg-blue-100 text-blue-700' : ''}
                  ${editingUser.role === 'borrower' ? 'bg-emerald-100 text-emerald-700' : ''}
                `}>
                  {editingUser.role.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Student Number Assignment — only for borrowers */}
              {editingUser.role === 'borrower' && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                  <label htmlFor="edit-student-number" className="text-sm font-semibold text-indigo-900 flex items-center gap-1.5">
                    <Hash className="w-4 h-4" aria-hidden="true" /> Student Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="edit-student-number"
                      type="text"
                      spellCheck={false}
                      autoComplete="off"
                      value={studentNumberInput}
                      onChange={(e) => setStudentNumberInput(e.target.value)}
                      placeholder={editingUser.student_number || 'e.g. 2024-0001-MNL'}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-indigo-200 bg-white focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 outline-none text-sm font-mono transition tabular-nums"
                    />
                    <button
                      type="button"
                      disabled={isStudentNumPending || !studentNumberInput.trim()}
                      onClick={handleSetStudentNumber}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 outline-none"
                    >
                      {isStudentNumPending ? '…' : 'Assign'}
                    </button>
                  </div>
                  {editingUser.student_number && (
                    <p className="text-xs text-indigo-600">
                      Current: <span className="font-mono font-bold">{editingUser.student_number}</span>
                    </p>
                  )}
                </div>
              )}

              <form action={handleUpdateRole} className="space-y-6">
                <div>
                  <label htmlFor="edit-role" className="text-sm font-semibold text-slate-700 block mb-2">Change Account Role</label>
                  <select id="edit-role" name="role" defaultValue={editingUser.role} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 outline-none transition bg-white font-medium text-slate-800">
                    <option value="borrower">Borrower (Student)</option>
                    <option value="circulation_assistant">Circulation Assistant</option>
                    <option value="librarian">Librarian</option>
                    <option value="super_admin">System Administrator (Super Admin)</option>
                  </select>
                  
                  <div className="mt-4 p-3 bg-slate-50/50 rounded-lg text-xs text-slate-600 space-y-2 border border-slate-100">
                     <p><span className="font-semibold text-slate-700">Borrower:</span> Standard access to search catalog</p>
                     <p><span className="font-semibold text-slate-700">Circulation:</span> Can process checkouts and returns</p>
                     <p><span className="font-semibold text-slate-700">Librarian:</span> Manage catalog and basic users</p>
                     <p><span className="font-semibold text-rose-600">Super Admin:</span> Full system control and role management</p>
                  </div>
                </div>

                <div className="pt-6 flex flex-col justify-between gap-6 border-t border-slate-100">
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                      disabled={isPending}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="group flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold transition shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 outline-none"
                    >
                      {isPending ? 'Updating…' : (
                        <>
                          <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                          Save Role
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex justify-center">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isPending}
                      className="flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
                    >
                      <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                      Permanently Delete User
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Users Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div ref={parentRef} className="overflow-auto max-h-[600px] w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm shadow-slate-200/50">
              <tr className="border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[30%]">Name / Email</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%] hidden lg:table-cell">Student No.</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%] hidden md:table-cell">Last Sign In</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">Role</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">No users found in database.</td>
                </tr>
              ) : (
                <>
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px` }} className="border-none" />
                  )}
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const p = profiles[virtualRow.index]
                    return (
                      <tr 
                        key={p.id} 
                        className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-none"
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                      >
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{p.full_name || 'Unnamed User'}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{p.email}</div>
                        </td>
                        <td className="py-4 px-6 hidden lg:table-cell">
                          {p.student_number
                            ? <span className="font-mono text-xs text-slate-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg tabular-nums">{p.student_number}</span>
                            : <span className="text-xs text-slate-300 italic">—</span>
                          }
                        </td>
                        <td className="py-4 px-6 hidden md:table-cell">
                          {p.last_sign_in_at
                            ? <span className="text-sm text-slate-600 tabular-nums">{new Date(p.last_sign_in_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            : <span className="text-xs text-slate-400 italic">Never</span>
                          }
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                            ${p.role === 'super_admin' ? 'bg-rose-100 text-rose-700 border border-rose-200' : ''}
                            ${p.role === 'librarian' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : ''}
                            ${p.role === 'circulation_assistant' ? 'bg-blue-100 text-blue-700 border border-blue-200' : ''}
                            ${p.role === 'borrower' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : ''}
                          `}>
                            {p.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {['super_admin', 'librarian'].includes(currentUserRole) && (
                            <button 
                              onClick={() => {
                                setEditingUser(p)
                                setStudentNumberInput(p.student_number || '')
                                setError(null)
                                setSuccess(null)
                                setIsAdding(false)
                              }}
                              className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                              title="Manage User"
                              aria-label={`Manage ${p.full_name || 'User'}`}
                            >
                              <MoreVertical className="w-5 h-5" aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: `${rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end ?? 0)}px` }} className="border-none" />
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
