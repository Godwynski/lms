'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from './actions'
import { Mail, Lock, MoveRight, HelpCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function LoginForm({ errorParams }: { errorParams?: string }) {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <div className="w-full max-w-md space-y-8 backdrop-blur-2xl bg-white/80 p-6 sm:p-10 border border-slate-200/50 rounded-[2rem] shadow-2xl relative z-10 transition-all">
      <div className="absolute top-0 right-0 p-6 hidden sm:block">
        <button type="button" className="text-slate-400 hover:text-indigo-500 transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="text-center space-y-2">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-lg shadow-indigo-500/30 items-center justify-center p-[2px] mb-2">
           <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
           </div>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
          Library Portal
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          Secure access for staff and borrowers
        </p>
      </div>

      {errorParams && (
        <div className="bg-red-50/80 text-red-600 p-4 rounded-2xl text-sm border border-red-100 flex items-start gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="font-medium leading-relaxed">{typeof errorParams === 'string' ? errorParams : 'Authentication failed'}</span>
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
          Sign in with Microsoft 365
        </button>
      </form>

      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white/80 text-slate-500 font-medium">Or continue with email</span>
        </div>
      </div>
      */}

      <form className="mt-6 space-y-5" action={login}>
        <div className="space-y-4">
          <div className="group relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Mail className="w-5 h-5" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none block w-full pl-12 pr-4 py-3.5 border-2 border-slate-100 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-0 focus:border-indigo-500 bg-slate-50/50 focus:bg-white sm:text-sm font-medium transition-all"
              placeholder="Library Email Address"
            />
          </div>
          <div className="group relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="appearance-none block w-full pl-12 pr-12 py-3.5 border-2 border-slate-100 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-0 focus:border-indigo-500 bg-slate-50/50 focus:bg-white sm:text-sm font-medium transition-all"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-500 transition-colors focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full" />
              ) : (
                <Eye className="w-5 h-5 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded focus:ring-offset-0 transition-all cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 font-medium cursor-pointer">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                Forgot password?
              </a>
            </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="group w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98]"
          >
            Sign in
            <MoveRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </form>

      <div className="text-center mt-8 pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-500 font-medium">
            No library card yet?{' '}
            <Link href="/register" className="text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline transition-colors underline-offset-4 font-semibold">
              Register locally
            </Link>
          </p>
      </div>
    </div>
  )
}
