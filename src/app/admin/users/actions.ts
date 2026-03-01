'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { extractStudentNumberFromEmail } from '@/lib/email-utils'

export async function adminCreateUser(formData: FormData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: 'Server configuration error: Missing Service Role Key' }
  }

  // We must bypass the standard auth client so the active Admin doesn't get logged out.
  // We use the @supabase/supabase-js client with the SERVICE_ROLE_KEY specifically for this.
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // 1. Verify current user is actually an admin
  const standardSupabase = await createClient()
  const { data: { user } } = await standardSupabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await standardSupabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'librarian'].includes(profile.role)) {
    return { error: 'Only administrators can create users directly.' }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  const fullName = formData.get('full_name') as string

  if (!email || !password || !role || !fullName) {
    return { error: 'All fields are required' }
  }

  // 2. Create user via Admin Auth API
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Auto-confirm the email
    user_metadata: {
      role: role,
      full_name: fullName
    }
  })

  if (createError) {
    console.error('Admin user creation failed:', createError)
    if (createError.message.includes('already registered')) {
        return { error: 'A user with this email already exists.' }
    }
    return { error: createError.message }
  }

  // 3. The trigger "on_auth_user_created" inserts the profile automatically.
  // If this is a borrower with an STI email, auto-set the student number.
  if (newUser?.user && role === 'borrower') {
    const autoStudentNumber = extractStudentNumberFromEmail(email)
    if (autoStudentNumber) {
      // Small delay to allow the DB trigger to create the profile first
      await new Promise(resolve => setTimeout(resolve, 800))
      await supabaseAdmin
        .from('profiles')
        .update({ student_number: autoStudentNumber })
        .eq('id', newUser.user.id)
    }
  }

  revalidatePath('/admin/users')
  const autoNum = role === 'borrower' ? extractStudentNumberFromEmail(email) : null
  const msg = autoNum
    ? `Account created for ${fullName}. Student number auto-set to ${autoNum}.`
    : `Successfully created ${role} account for ${fullName}`
  return { success: true, message: msg }
}


export async function adminUpdateUserRole(targetUserId: string, newRole: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return { error: 'Missing Service Role Key' }

  // 1. Verify caller is an admin
  const standardSupabase = await createClient()
  const { data: { user } } = await standardSupabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await standardSupabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'librarian'].includes(profile.role)) {
    return { error: 'Unauthorized to modify user roles.' }
  }

  // Prevent users from demoting themselves accidentally
  if (user.id === targetUserId) {
      return { error: 'You cannot change your own role from this interface.' }
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 2. Update the Auth metadata
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
    user_metadata: { role: newRole }
  })

  if (authError) return { error: `Auth update failed: ${authError.message}` }

  // 3. Update the public profiles table
  const { error: dbError } = await supabaseAdmin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (dbError) return { error: `Database update failed: ${dbError.message}` }

  revalidatePath('/admin/users')
  return { success: true, message: `Role updated to ${newRole}` }
}

export async function adminDeleteUser(targetUserId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return { error: 'Missing Service Role Key' }

  // 1. Verify caller is an admin
  const standardSupabase = await createClient()
  const { data: { user } } = await standardSupabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await standardSupabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'librarian'].includes(profile.role)) {
    return { error: 'Unauthorized to delete users.' }
  }

  if (user.id === targetUserId) {
    return { error: 'You cannot delete your own account while logged in.' }
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 2. Delete the user from Auth. (The public profile will usually cascade delete based on foreign keys)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true, message: 'User permanently deleted.' }
}

export async function adminUpdateStudentNumber(targetUserId: string, studentNumber: string) {
  const standardSupabase = await createClient()
  const { data: { user } } = await standardSupabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await standardSupabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'librarian'].includes(profile.role)) {
    return { error: 'Only administrators can set student numbers.' }
  }

  const clean = studentNumber.trim()
  if (!clean) return { error: 'Student number cannot be empty.' }

  const { error: updateError } = await standardSupabase
    .from('profiles')
    .update({ student_number: clean })
    .eq('id', targetUserId)

  if (updateError) {
    if (updateError.code === '23505') return { error: 'That student number is already assigned to another account.' }
    return { error: updateError.message }
  }

  revalidatePath('/admin/users')
  return { success: true, message: `Student number set to ${clean}` }
}
