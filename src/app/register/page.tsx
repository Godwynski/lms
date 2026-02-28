import Link from 'next/link'
import { signup } from '@/app/login/actions'
import { UserPlus, Mail, Lock, MoveRight, ShieldCheck, AlertCircle } from 'lucide-react'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const currentParams = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-200/50 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/50 blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full bg-emerald-200/30 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 backdrop-blur-2xl bg-white/80 p-6 sm:p-10 border border-slate-200/50 rounded-[2rem] shadow-2xl transition-all">
        <div className="absolute top-0 right-0 p-6 hidden sm:block">
          <div className="flex items-center space-x-1 text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-semibold">Secure</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30 items-center justify-center p-[2px] mb-2">
             <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-blue-500" />
             </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Library Registration
          </h2>
          <p className="text-sm text-slate-500 font-medium px-4">
            Create your borrower account. You must use your <span className="font-semibold text-blue-600">official school email</span> to register.
          </p>
        </div>

        {currentParams?.error && (
          <div className="bg-red-50/80 text-red-600 p-4 rounded-2xl text-sm border border-red-100 flex items-start gap-3 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="font-medium leading-relaxed">{typeof currentParams.error === 'string' ? currentParams.error : 'Registration failed'}</span>
          </div>
        )}

        {/*
        <form action={signInWithMicrosoft} className="mt-8">
          <button
            type="submit"
            className="group w-full flex justify-center items-center py-3.5 px-4 border border-slate-200 text-sm font-semibold rounded-2xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 shadow-sm transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
              <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
              <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
              <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
            </svg>
            Continue with Microsoft 365
          </button>
        </form>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white/80 text-slate-500 font-medium">Or register with email</span>
          </div>
        </div>
        */}

        <form className="mt-6 space-y-5" action={signup}>
          <div className="space-y-4">
            <div>
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full pl-12 pr-4 py-3.5 border-2 border-slate-100 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-0 focus:border-blue-500 bg-slate-50/50 focus:bg-white sm:text-sm font-medium transition-all"
                  placeholder="School Email (e.g., @student.school.edu)"
                />
              </div>
            </div>
            


            <div className="group relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none block w-full pl-12 pr-4 py-3.5 border-2 border-slate-100 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-0 focus:border-blue-500 bg-slate-50/50 focus:bg-white sm:text-sm font-medium transition-all"
                placeholder="Secure Password"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="group w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98]"
            >
              Get Library Card
              <MoveRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-slate-100">
           <p className="text-sm text-slate-500 font-medium">
             Already have an account?{' '}
             <Link href="/login" className="text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors underline-offset-4 font-semibold">
               Sign in instead
             </Link>
           </p>
        </div>
      </div>
    </div>
  )
}
