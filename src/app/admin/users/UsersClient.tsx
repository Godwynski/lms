'use client'

import { useState } from 'react'
import { adminCreateUser, adminUpdateUserRole, adminDeleteUser } from './actions'
import { UserPlus, Save, AlertCircle, X, CheckCircle2, MoreVertical, ShieldAlert, Trash2 } from 'lucide-react'

// This defines the shape of the user profiles we fetch
type Profile = {
  id: string
  full_name: string | null
  role: string
  created_at?: string
}

export default function UsersClient({ profiles, currentUserRole }: { profiles: Profile[], currentUserRole: string }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
    setIsPending(true)
    setError(null)
    setSuccess(null)

    const newRole = formData.get('role') as string
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
            className="group flex items-center px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
          >
            <UserPlus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Create User
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 animate-in slide-in-from-top-2">
           <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
           <span className="font-medium text-sm leading-relaxed">{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-3 animate-in fade-in">
           <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
           <span className="font-medium text-sm">{success}</span>
        </div>
      )}

      {/* Add User Form Modal / Card */}
      {isAdding && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-top-4">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Add New Account</h2>
            <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form action={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <input required type="text" name="full_name" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Email Address (Login)</label>
                <input required type="email" name="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="jane@school.edu" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Temporary Password</label>
                <input required type="password" name="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Account Role</label>
                <select name="role" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all bg-white font-medium text-slate-800">
                  <option value="borrower">Borrower (Student)</option>
                  <option value="circulation_assistant">Circulation Assistant</option>
                  <option value="librarian">Librarian</option>
                  <option value="super_admin">System Administrator (Super Admin)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="group flex items-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold transition-all shadow-md hover:shadow-lg"
              >
                {isPending ? 'Saving...' : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Provision Account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-top-4">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Manage Roles & Access
            </h2>
            <button onClick={() => setEditingUser(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-900">{editingUser.full_name || 'Unnamed User'}</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">{editingUser.id}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                ${editingUser.role === 'super_admin' ? 'bg-rose-100 text-rose-700' : ''}
                ${editingUser.role === 'librarian' ? 'bg-indigo-100 text-indigo-700' : ''}
                ${editingUser.role === 'circulation_assistant' ? 'bg-blue-100 text-blue-700' : ''}
                ${editingUser.role === 'borrower' ? 'bg-emerald-100 text-emerald-700' : ''}
              `}>
                Current: {editingUser.role}
              </span>
            </div>

            <form action={handleUpdateRole} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Change Account Role</label>
                <select name="role" defaultValue={editingUser.role} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all bg-white font-medium text-slate-800">
                  <option value="borrower">Borrower (Student)</option>
                  <option value="circulation_assistant">Circulation Assistant</option>
                  <option value="librarian">Librarian</option>
                  <option value="super_admin">System Administrator (Super Admin)</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">Upgrading a user grants them immediate access to restricted dashboards based on the new role.</p>
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete User
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 sm:flex-none group flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    {isPending ? 'Updating...' : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">User ID (System)</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 font-medium">No users found in database.</td>
                </tr>
              ) : (
                profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{p.full_name || 'Unnamed User'}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5" title="Auth Email usually matches but is hidden for privacy here unless requested">Profile ID matched to Auth</div>
                    </td>
                    <td className="py-4 px-6">
                      <code className="text-[11px] px-2 py-1 bg-slate-100 text-slate-600 rounded font-mono">{p.id}</code>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${p.role === 'super_admin' ? 'bg-rose-100 text-rose-700 border border-rose-200' : ''}
                        ${p.role === 'librarian' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : ''}
                        ${p.role === 'circulation_assistant' ? 'bg-blue-100 text-blue-700 border border-blue-200' : ''}
                        ${p.role === 'borrower' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : ''}
                      `}>
                        {p.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {['super_admin', 'librarian'].includes(currentUserRole) && (
                        <button 
                          onClick={() => { setEditingUser(p); setError(null); setSuccess(null); setIsAdding(false); }}
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Manage User"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
