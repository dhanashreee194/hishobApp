import {create} from 'zustand';

export type AppRole = 'owner' | 'assistant';

type SyncStatus = {
  ready: boolean;
  phone: string | null;
  role: AppRole;
  skippedAuth: boolean;
  lastSyncedAt: number | null;
  lastBackupAt: number | null;
  syncing: boolean;
  backingUp: boolean;
  syncError: string | null;
  backupError: string | null;
  patch: (partial: Partial<Omit<SyncStatus, 'patch'>>) => void;
};

export const useSyncStatus = create<SyncStatus>(set => ({
  ready: false,
  phone: null,
  role: 'owner',
  skippedAuth: false,
  lastSyncedAt: null,
  lastBackupAt: null,
  syncing: false,
  backingUp: false,
  syncError: null,
  backupError: null,
  patch: partial => set(partial),
}));

export function formatStamp(ms: number | null): string {
  if (ms == null) {
    return 'अजून नाही';
  }
  const date = new Date(ms);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
}

export function syncFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/network|fetch|offline|internet|failed to connect/i.test(message)) {
    return 'नेटवर्क नाही. स्थानिक हिशोब सुरू आहे.';
  }
  return 'सिंक झाले नाही. स्थानिक हिशोब सुरू आहे.';
}
