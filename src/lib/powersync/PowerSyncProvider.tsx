'use client';

import React, { useContext, useEffect, useRef, useState, useMemo } from 'react';
import { PowerSyncDatabase } from '@powersync/web';
import { PowerSyncContext } from '@powersync/react';
import { AppSchema } from './schema';
import { SupabaseConnector } from './connector';
import { createClient } from '@/utils/supabase/client';
import { useImagePreloader } from './hooks/useImagePreloader';

/**
 * PowerSyncProvider initializes the local SQLite database via @powersync/web.
 * The database persists in the browser's Origin Private File System (OPFS),
 * so data survives page reloads and works completely offline.
 *
 * IMPORTANT: We set `ready = true` immediately after creating the DB instance,
 * NOT after connect(). This means the UI renders instantly.
 * connect() runs fully in the background — it only handles cloud sync.
 * Local reads/writes work without any network connection.
 */
export const PowerSyncProvider = ({ children }: { children: React.ReactNode }) => {
  const dbRef = useRef<PowerSyncDatabase | null>(null);
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Initialize exactly once
    if (dbRef.current) return;

    const ps = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'lms_v1.db',
      },
    });

    dbRef.current = ps;

    // Set db and render immediately — local SQLite is usable right away.
    // Don't wait for connect() which requires network + WASM init.
    setDb(ps);

    // Connect in the background - this handles cloud sync, not local DB access.
    // If no POWERSYNC_URL is set, the connector returns null and sync is skipped.
    const connector = new SupabaseConnector(supabase);
    ps.connect(connector).catch((e) => {
      console.warn('[PowerSync] connect() error (non-fatal, local DB still works):', e);
    });

    return () => {
      ps.close();
      dbRef.current = null;
      setDb(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!db) {
    // Only shown for the very brief moment before the DB object is created
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
          <p className="text-sm font-medium">Starting up…</p>
        </div>
      </div>
    );
  }

  return (
    <PowerSyncContext.Provider value={db}>
      <ImagePreloaderMount />
      {children}
    </PowerSyncContext.Provider>
  );
};

/**
 * Inner component that has access to the PowerSync context.
 * Activates the image preloader so all book covers are cached offline.
 */
function ImagePreloaderMount() {
  useImagePreloader()
  return null
}

export const useLmsDb = () => {
  const context = useContext(PowerSyncContext);
  if (!context) {
    throw new Error('useLmsDb must be used within a PowerSyncProvider');
  }
  return context;
};
