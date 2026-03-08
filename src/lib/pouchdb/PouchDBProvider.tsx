'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getLocalDB, startSync, stopSync } from './client'
import { useImagePreloader } from '@/lib/pouchdb/hooks/useImagePreloader'

export const PouchDBContext = createContext<PouchDB.Database | null>(null)

export const PouchDBProvider = ({ children }: { children: React.ReactNode }) => {
  const [db] = useState<PouchDB.Database>(getLocalDB)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Start initial sync/replication with remote CouchDB in the background.
    
    // Start sync immediately
    startSync()
    
    const readyTimer = setTimeout(() => {
      setIsReady(true)
    }, 0)
    
    return () => {
      clearTimeout(readyTimer)
      stopSync()
    }
  }, [])

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
          <p className="text-sm font-medium">Starting up PouchDB...</p>
        </div>
      </div>
    )
  }

  return (
    <PouchDBContext.Provider value={db}>
      <ImagePreloaderMount />
      {children}
    </PouchDBContext.Provider>
  )
}

function ImagePreloaderMount() {
  useImagePreloader()
  return null
}

export const usePouchDb = () => {
  const context = useContext(PouchDBContext)
  if (!context) {
    throw new Error('usePouchDb must be used within a PouchDBProvider')
  }
  return context
}
