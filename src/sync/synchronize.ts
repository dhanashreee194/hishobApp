import {DirtyRaw} from '@nozbe/watermelondb/RawRecord';
import {synchronize, SyncDatabaseChangeSet, SyncRejectedIds} from '@nozbe/watermelondb/sync';
import {database} from '../db';
import {getSupabase} from './client';
import {recordForStorage, resolveByUpdatedAt, syncTableNames} from './records';
import {syncFailureMessage, useSyncStatus} from './status';

const ASSISTANT_READONLY = new Set([
  'businesses',
  'users',
  'partners',
  'partner_payments',
  'partner_settlements',
  'backup_records',
]);

const LAST_PULLED_AT = '__watermelon_last_pulled_at';

type PullPayload = {
  timestamp: number;
  changes: Record<string, {created: unknown[]; updated: unknown[]; deleted: string[]}>;
};

type PushPayload = {
  rejected?: Record<string, string[]>;
};

let running = false;

function rejectedIds(payload: PushPayload | null): SyncRejectedIds | undefined {
  if (!payload?.rejected) {
    return undefined;
  }
  const ids: Record<string, string[]> = {};
  for (const [table, list] of Object.entries(payload.rejected)) {
    if (list.length > 0) {
      ids[table] = list;
    }
  }
  return Object.keys(ids).length > 0 ? (ids as SyncRejectedIds) : undefined;
}

export async function resetSyncCursor(): Promise<void> {
  await database.adapter.removeLocal(LAST_PULLED_AT);
}

async function runSync(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    return false;
  }

  let sawRejection = false;
  await synchronize({
    database,
    sendCreatedAsUpdated: true,
    conflictResolver: (_table, local, remote, resolved) => resolveByUpdatedAt(local, remote, resolved),
    pullChanges: async ({lastPulledAt}) => {
      const {data, error} = await supabase.rpc('pull_changes', {
        last_pulled_at: lastPulledAt ?? null,
      });
      if (error) {
        throw error;
      }
      const payload = data as PullPayload;
      if (typeof payload?.timestamp !== 'number' || payload.timestamp <= 0) {
        throw new Error('pullChanges returned an invalid timestamp');
      }
      const changes: PullPayload['changes'] = {};
      for (const table of syncTableNames()) {
        const change = payload.changes?.[table];
        changes[table] = {
          created: [],
          updated: change?.updated ?? [],
          deleted: change?.deleted ?? [],
        };
      }
      return {changes, timestamp: payload.timestamp};
    },
    pushChanges: async ({changes}) => {
      const sanitized: Record<string, {created: DirtyRaw[]; updated: DirtyRaw[]; deleted: string[]}> = {};
      const localChanges = changes as SyncDatabaseChangeSet &
        Record<string, {created: DirtyRaw[]; updated: DirtyRaw[]; deleted: string[]}>;
      const assistant = useSyncStatus.getState().role === 'assistant';
      for (const table of syncTableNames()) {
        const change = localChanges[table] ?? {created: [], updated: [], deleted: []};
        if (assistant && ASSISTANT_READONLY.has(table)) {
          sanitized[table] = {created: [], updated: [], deleted: []};
          continue;
        }
        sanitized[table] = {
          created: change.created.map(raw => recordForStorage(raw, table)),
          updated: change.updated.map(raw => recordForStorage(raw, table)),
          deleted: change.deleted,
        };
      }
      const {data, error} = await supabase.rpc('push_changes', {changes: sanitized});
      if (error) {
        throw error;
      }
      const rejected = rejectedIds(data as PushPayload);
      if (rejected) {
        sawRejection = true;
      }
      return {experimentalRejectedIds: rejected};
    },
  });
  return sawRejection;
}

export async function syncNow(): Promise<void> {
  if (running || !getSupabase()) {
    return;
  }
  running = true;
  try {
    const session = await getSupabase()!.auth.getSession();
    if (!session.data.session) {
      return;
    }
    useSyncStatus.getState().patch({syncing: true, syncError: null});
    const rejected = await runSync();
    if (rejected) {
      await resetSyncCursor();
      await runSync();
    }
    useSyncStatus.getState().patch({
      lastSyncedAt: Date.now(),
      syncError: null,
    });
    await persistStatus();
  } catch (error) {
    useSyncStatus.getState().patch({syncError: syncFailureMessage(error)});
  } finally {
    running = false;
    useSyncStatus.getState().patch({syncing: false});
  }
}

export async function persistStatus(): Promise<void> {
  const {lastSyncedAt, lastBackupAt, skippedAuth} = useSyncStatus.getState();
  await database.localStorage.set('mh_sync_status', {lastSyncedAt, lastBackupAt, skippedAuth});
}

export async function hydrateStatus(): Promise<void> {
  const stored = await database.localStorage.get<{
    lastSyncedAt: number | null;
    lastBackupAt: number | null;
    skippedAuth: boolean;
  }>('mh_sync_status');
  useSyncStatus.getState().patch({
    lastSyncedAt: stored?.lastSyncedAt ?? null,
    lastBackupAt: stored?.lastBackupAt ?? null,
    skippedAuth: stored?.skippedAuth ?? false,
    ready: true,
  });
}
