'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

async function verifyStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', supabase: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !STAFF_ROLES.includes(profile.role)) return { error: 'Unauthorized', supabase: null }
  return { error: null, supabase }
}

export async function createThesis(formData: FormData) {
  const { error, supabase } = await verifyStaff()
  if (error || !supabase) return { error }

  const payload = {
    title: formData.get('title') as string,
    author: formData.get('author') as string,
    course: formData.get('course') as string || null,
    publication_year: formData.get('publication_year') ? Number(formData.get('publication_year')) : null,
    abstract: formData.get('abstract') as string || null,
    pdf_url: formData.get('pdf_url') as string || null,
  }

  if (!payload.title || !payload.author) return { error: 'Title and Author are required.' }

  const { error: insertError } = await supabase.from('theses').insert(payload)
  if (insertError) return { error: insertError.message }

  revalidatePath('/thesis')
  revalidatePath('/admin/thesis')
  return { success: true }
}

export async function updateThesis(id: string, formData: FormData) {
  const { error, supabase } = await verifyStaff()
  if (error || !supabase) return { error }

  const payload = {
    title: formData.get('title') as string,
    author: formData.get('author') as string,
    course: formData.get('course') as string || null,
    publication_year: formData.get('publication_year') ? Number(formData.get('publication_year')) : null,
    abstract: formData.get('abstract') as string || null,
    pdf_url: formData.get('pdf_url') as string || null,
  }

  if (!payload.title || !payload.author) return { error: 'Title and Author are required.' }

  const { error: updateError } = await supabase.from('theses').update(payload).eq('id', id)
  if (updateError) return { error: updateError.message }

  revalidatePath('/thesis')
  revalidatePath('/admin/thesis')
  return { success: true }
}

export async function deleteThesis(id: string) {
  const { error, supabase } = await verifyStaff()
  if (error || !supabase) return { error }

  const { error: deleteError } = await supabase.from('theses').delete().eq('id', id)
  if (deleteError) return { error: deleteError.message }

  revalidatePath('/thesis')
  revalidatePath('/admin/thesis')
  return { success: true }
}
