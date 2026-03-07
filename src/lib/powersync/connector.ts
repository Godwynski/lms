import { PowerSyncBackendConnector, AbstractPowerSyncDatabase } from '@powersync/web';
import { SupabaseClient } from '@supabase/supabase-js';
import { emitSyncError, classifyError } from './syncErrorBus';

/**
 * SupabaseConnector bridges PowerSync's local SQLite engine with Supabase.
 *
 * fetchCredentials: Returns the Supabase JWT so PowerSync can authenticate
 *  streaming data from your Supabase project (requires NEXT_PUBLIC_POWERSYNC_URL
 *  to be set if using PowerSync Cloud).
 *
 * uploadData: Writes locally-queued mutations (PUT/PATCH/DELETE) back to Supabase
 *  when connection is available. Emits structured errors to the UI via syncErrorBus.
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async fetchCredentials() {
    const { data: { session }, error } = await this.supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    const powersyncUrl = process.env.NEXT_PUBLIC_POWERSYNC_URL;

    // If no PowerSync URL is configured, the local DB still works for reads/writes
    // but won't receive real-time data streams from the cloud.
    if (!powersyncUrl) {
      console.warn('[PowerSync] NEXT_PUBLIC_POWERSYNC_URL is not set. Sync will be offline-only.');
      return null;
    }

    return {
      endpoint: powersyncUrl,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        const table = this.supabase.from(op.table);

        switch (op.op) {
          case 'PUT': {
            const { error: putError } = await table.upsert({ id: op.id, ...op.opData });
            if (putError) throw putError;
            break;
          }
          case 'PATCH': {
            const { error: patchError } = await table.update(op.opData).eq('id', op.id);
            if (patchError) throw patchError;
            break;
          }
          case 'DELETE': {
            const { error: deleteError } = await table.delete().eq('id', op.id);
            if (deleteError) throw deleteError;
            break;
          }
        }
      }

      await transaction.complete();

    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const errorCode = err?.code;
      const errorType = classifyError(errorCode);

      console.error('[PowerSync] Data upload error:', e);

      if (errorType === 'rls') {
        // RLS rejection — data was blocked by Supabase policy, discard to unblock queue
        emitSyncError({
          type: 'rls',
          message: 'A change was blocked by database permissions. Some data may not have been saved.',
          code: errorCode,
        });
        await transaction.complete();

      } else if (errorType === 'conflict') {
        // Unique constraint — record already exists, skip to unblock queue
        emitSyncError({
          type: 'conflict',
          message: 'A duplicate record was detected. The conflicting change was skipped.',
          code: errorCode,
        });
        await transaction.complete();

      } else if (errorType === 'auth') {
        // Auth expired — let PowerSync retry after re-auth
        emitSyncError({
          type: 'auth',
          message: 'Your session has expired. Please sign in again to continue syncing.',
          code: errorCode,
        });
        throw e; // Rethrow so PowerSync pauses sync and retries on next connect

      } else {
        // Network / unknown — transient, PowerSync will retry automatically
        emitSyncError({
          type: 'network',
          message: 'A sync error occurred. Changes will be retried automatically.',
          code: errorCode,
        });
        throw e;
      }
    }
  }
}
