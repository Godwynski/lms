import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  cookieStore.delete('AuthSession')

  revalidatePath('/', 'layout')
  return NextResponse.redirect(new URL('/', request.url), {
    status: 302,
  })
}
