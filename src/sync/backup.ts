import {Database, Model} from '@nozbe/watermelondb';
import {database} from '../db';
import {BackupRecord} from '../db/models';
import {getSupabase} from './client';
import {
  checksum,
  columnNames,
  LedgerSnapshot,
  syncTableNames,
} from './records';
import {useSyncStatus} from './status';
import {BackupPinRequired} from '../security/envelope';
import {listLocalBackups, readLocalBackup, writeLocalBackup} from '../security/localBackup';
import {openBackupText, sealBackupText} from '../security/lock';
import {persistStatus, resetSyncCursor} from './synchronize';

export type BackupFile = {
  name: string;
  path: string;
};

function utf8Size(value: string): number {
  let size = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) {
      size += 1;
    } else if (code < 0x800) {
      size += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      size += 4;
      index += 1;
    } else {
      size += 3;
    }
  }
  return size;
}

function snapshotFromDatabase(db: Database, createdAt: number): Promise<LedgerSnapshot> {
  return db.read(async () => {
    const tables: LedgerSnapshot['tables'] = {};
    for (const table of syncTableNames()) {
      const rows = await db.get(table).query().fetch();
      tables[table] = rows.map(row => {
        const raw = (row as Model)._raw as {[key: string]: unknown};
        const stored: Record<string, unknown> = {id: raw.id};
        for (const column of columnNames(table)) {
          stored[column] = raw[column] === undefined ? null : raw[column];
        }
        return stored;
      });
    }
    return {version: 1, createdAt, tables};
  }, 'backup-export');
}

export async function backupNow(): Promise<boolean> {
  const supabase = getSupabase();
  const status = useSyncStatus.getState();
  if (!supabase || status.backingUp) {
    return false;
  }
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user.id;
  if (!userId) {
    status.patch({backupError: 'बॅकअपसाठी आधी फोनने प्रवेश करा.'});
    return false;
  }

  status.patch({backingUp: true, backupError: null});
  try {
    const createdAt = Date.now();
    const snapshot = await snapshotFromDatabase(database, createdAt);
    const sealed = await sealBackupText(JSON.stringify(snapshot));
    const fileName = `backup-${createdAt}.mhb`;
    await writeLocalBackup(sealed, createdAt);
    const path = `${userId}/${fileName}`;
    const upload = await supabase.storage.from('backups').upload(path, sealed, {
      contentType: 'application/json',
      upsert: false,
    });
    if (upload.error) {
      throw upload.error;
    }
    await database.write(async () => {
      await database.get<BackupRecord>('backup_records').create(record => {
        record.createdAt = new Date(createdAt);
        record.fileName = fileName;
        record.size = utf8Size(sealed);
        record.checksum = checksum(sealed);
      });
    });
    useSyncStatus.getState().patch({lastBackupAt: createdAt, backupError: null});
    await persistStatus();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    useSyncStatus.getState().patch({
      backupError: /network|fetch|offline/i.test(message)
        ? 'नेटवर्क नाही. स्थानिक हिशोब सुरू आहे.'
        : 'बॅकअप झाला नाही. स्थानिक हिशोब सुरू आहे.',
    });
    return false;
  } finally {
    useSyncStatus.getState().patch({backingUp: false});
  }
}

export async function listBackups(): Promise<BackupFile[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user.id;
  if (!userId) {
    return [];
  }
  const listed = await supabase.storage.from('backups').list(userId, {
    sortBy: {column: 'created_at', order: 'desc'},
    limit: 30,
  });
  if (listed.error) {
    throw listed.error;
  }
  return (listed.data ?? [])
    .filter(file => file.name.endsWith('.json') || file.name.endsWith('.mhb'))
    .map(file => ({name: file.name, path: `${userId}/${file.name}`}));
}

export function parseSnapshot(text: string): LedgerSnapshot {
  const parsed = JSON.parse(text) as LedgerSnapshot;
  if (parsed?.version !== 1 || !parsed.tables || typeof parsed.tables !== 'object') {
    throw new Error('ही बॅकअप फाइल ओळखली नाही');
  }
  return parsed;
}

export async function exportLocalBackup(): Promise<string> {
  const status = useSyncStatus.getState();
  if (status.backingUp) {
    return '';
  }
  status.patch({backingUp: true, backupError: null});
  try {
    const createdAt = Date.now();
    const snapshot = await snapshotFromDatabase(database, createdAt);
    const sealed = await sealBackupText(JSON.stringify(snapshot));
    const path = await writeLocalBackup(sealed, createdAt);
    const fileName = path.split('/').pop() ?? `backup-${createdAt}.mhb`;
    await database.write(async () => {
      await database.get<BackupRecord>('backup_records').create(record => {
        record.createdAt = new Date(createdAt);
        record.fileName = fileName;
        record.size = utf8Size(sealed);
        record.checksum = checksum(sealed);
      });
    });
    useSyncStatus.getState().patch({lastBackupAt: createdAt, backupError: null});
    await persistStatus();
    return path;
  } catch {
    useSyncStatus.getState().patch({
      backupError: 'स्थानिक बॅकअप फाइल तयार झाली नाही. हिशोब फोनवर तसाच आहे.',
    });
    return '';
  } finally {
    useSyncStatus.getState().patch({backingUp: false});
  }
}

export async function restoreBackup(path: string, pin?: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('क्लाउड जोडणी सेट नाही');
  }
  const download = await supabase.storage.from('backups').download(path);
  if (download.error || !download.data) {
    throw download.error ?? new Error('बॅकअप उतरला नाही');
  }
  const body = download.data as Blob & {text: () => Promise<string>};
  const snapshot = parseSnapshot(await openBackupText(await body.text(), pin));
  const restored = await supabase.rpc('restore_snapshot', {snapshot});
  if (restored.error) {
    throw restored.error;
  }
  try {
    await replaceLocalLedger(snapshot);
  } catch {
    throw new Error('क्लाउड प्रत बदलली. फोनवरील प्रत बदलता आली नाही. सेटिंग्जमधून सिंक करा.');
  }
  await resetSyncCursor();
}

export async function restoreLocalBackup(path: string, pin?: string): Promise<void> {
  const snapshot = parseSnapshot(await openBackupText(await readLocalBackup(path), pin));
  await replaceLocalLedger(snapshot);
  await resetSyncCursor();
}

export {BackupPinRequired, listLocalBackups};

async function replaceLocalLedger(snapshot: LedgerSnapshot): Promise<void> {
  const known = new Set(syncTableNames());
  const existing = new Map<string, Model[]>();
  for (const table of syncTableNames()) {
    existing.set(table, await database.get(table).query().fetch());
  }

  const restoredAt = Date.now();
  await database.write(async () => {
    const deletions = [...existing.values()].flat().map(row => row.prepareDestroyPermanently());
    const creates = syncTableNames().flatMap(table => {
      const rows = snapshot.tables[table] ?? [];
      if (!known.has(table)) {
        return [];
      }
      return rows.map(raw =>
        database.get(table).prepareCreate(record => {
          const target = record._raw as {[key: string]: unknown};
          target.id = String(raw.id);
          for (const column of columnNames(table)) {
            const value = raw[column];
            if (column === 'updated_at') {
              target[column] = restoredAt;
            } else if (value == null && column === 'is_deleted') {
              target[column] = false;
            } else if (value == null && column === 'created_at') {
              target[column] = restoredAt;
            } else if (value == null && column === 'created_by') {
              target[column] = 'owner';
            } else {
              target[column] = value ?? null;
            }
          }
        }),
      );
    });
    const operations = [...deletions, ...creates];
    if (operations.length > 0) {
      await database.batch(...operations);
    }
  });
}
