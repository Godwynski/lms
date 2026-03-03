'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, Check, X } from 'lucide-react'

// Local class merging utility to avoid depending on external libraries
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ')

type ButtonState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Optional manual override for the loading state. Useful for useActionState hooks
   * where the pending Boolean is passed top-down.
   */
  isLoading?: boolean
  /**
   * Loading text to display. Defaults to "Processing..."
   */
  loadingText?: string
  /**
   * Optional manual override for forcing success or error states.
   */
  forcedState?: 'success' | 'error' | null
  /**
   * Optional message to flash when successful.
   */
  successText?: string
  /**
   * Optional message to flash when an error occurs.
   */
  errorText?: string
  /**
   * How long the success/error states remain before reverting to idle.
   */
  resetDelayMs?: number
  /**
   * The normal onClick handler. If it returns a Promise, AsyncButton handles
   * the loading, success, and error states automatically.
   */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<unknown>
}

export function AsyncButton({
  children,
  className,
  isLoading = false,
  loadingText = 'Processing...',
  forcedState = null,
  successText = 'Success',
  errorText = 'Failed',
  resetDelayMs = 2500,
  onClick,
  disabled,
  ...props
}: AsyncButtonProps) {
  const [internalState, setInternalState] = useState<ButtonState>('idle')

  // Derive the active state from either the external props or internal promise handler
  const activeState = forcedState || (isLoading ? 'loading' : internalState)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    if (activeState === 'success' || activeState === 'error') {
      timeoutId = setTimeout(() => {
        setInternalState('idle')
      }, resetDelayMs)
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [activeState, resetDelayMs])

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (activeState === 'loading' || activeState === 'success' || disabled) {
      e.preventDefault()
      return
    }

    if (!onClick) return

    const result = onClick(e)

    // If the onClick handler returns a Promise, we await it to manage state.
    if (result instanceof Promise) {
      setInternalState('loading')
      try {
        await result
        setInternalState('success')
      } catch (err) {
        console.error('AsyncButton Error:', err)
        setInternalState('error')
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={activeState === 'loading' || disabled}
      className={cn(
        // Base uniform styles that mimic the existing button classes
        'relative overflow-hidden inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        
        // Idle State
        activeState === 'idle' && '', // Relies on external classes passed in
        
        // Loading State
        activeState === 'loading' && 'cursor-wait opacity-80',
        
        // Success State
        activeState === 'success' && 'bg-emerald-500 hover:bg-emerald-600 border-transparent text-white focus-visible:ring-emerald-500',
        
        // Error State
        activeState === 'error' && 'bg-rose-500 hover:bg-rose-600 border-transparent text-white focus-visible:ring-rose-500',
        
        className
      )}
      {...props}
    >
      <div className={cn(
        "flex items-center justify-center gap-2 w-full transition-transform duration-300",
        activeState !== 'idle' ? "opacity-0 scale-95 absolute" : "opacity-100 scale-100 relative"
      )}>
        {children}
      </div>

      {activeState === 'loading' && (
        <div className="flex items-center justify-center gap-2 absolute inset-0 animate-in fade-in zoom-in-95 duration-200">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>{loadingText}</span>
        </div>
      )}

      {activeState === 'success' && (
        <div className="flex items-center justify-center gap-2 absolute inset-0 animate-in fade-in zoom-in-95 duration-200 text-white font-bold tracking-wide">
          <Check className="w-5 h-5 drop-shadow-sm" aria-hidden="true" />
          <span>{successText}</span>
        </div>
      )}

      {activeState === 'error' && (
        <div className="flex items-center justify-center gap-2 absolute inset-0 animate-in fade-in zoom-in-95 duration-200 text-white font-bold tracking-wide">
          <X className="w-5 h-5 drop-shadow-sm" aria-hidden="true" />
          <span>{errorText}</span>
        </div>
      )}
    </button>
  )
}
