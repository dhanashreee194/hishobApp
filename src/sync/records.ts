import {schema} from '../db/schema';
import type {DirtyRaw} from '@nozbe/watermelondb/RawRecord';

export type LedgerSnapshot = {
  version: 1;
  createdAt: number;
  tables: Record<string, DirtyRaw[]>;
};

export function syncTableNames(): string[] {
  return Object.keys(schema.tables);
}

export function columnNames(table: string): string[] {
  const columns = schema.tables[table]?.columns;
  if (!columns) {
    return [];
  }
  return Object.keys(columns);
}

export function recordForStorage(raw: DirtyRaw, table: string): DirtyRaw {
  const stored: DirtyRaw = {id: raw.id};
  for (const column of columnNames(table)) {
    const value = raw[column];
    stored[column] = value === undefined ? null : value;
  }
  if (stored.updated_at == null) {
    stored.updated_at = 0;
  }
  return stored;
}

export function resolveByUpdatedAt(
  local: DirtyRaw,
  remote: DirtyRaw,
  resolved: DirtyRaw,
): DirtyRaw {
  const localAt = Number(local.updated_at ?? 0);
  const remoteAt = Number(remote.updated_at ?? 0);
  if (remoteAt >= localAt) {
    return {...resolved, ...remote, id: remote.id ?? resolved.id};
  }
  return {...resolved, ...local, id: local.id ?? resolved.id};
}

export function checksum(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function backupIsDue(lastBackupAt: number | null, now: Date): boolean {
  if (lastBackupAt == null) {
    return true;
  }
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return lastBackupAt < start.getTime();
}
