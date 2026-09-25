import NetInfo from '@react-native-community/netinfo';
import React, {useEffect} from 'react';
import {AppState} from 'react-native';
import {backupNow} from './backup';
import {getSupabase} from './client';
import {backupIsDue} from './records';
import {refreshRole} from './role';
import {hydrateStatus, syncNow} from './synchronize';
import {useSyncStatus} from './status';

export function SyncController() {
  const ready = useSyncStatus(state => state.ready);
  const lastBackupAt = useSyncStatus(state => state.lastBackupAt);
  const phone = useSyncStatus(state => state.phone);

  useEffect(() => {
    let cancelled = false;
    hydrateStatus()
      .then(async () => {
        const supabase = getSupabase();
        if (!supabase || cancelled) {
          useSyncStatus.getState().patch({ready: true});
          return;
        }
        const session = await supabase.auth.getSession();
        if (session.data.session) {
          await refreshRole();
        }
        if (!cancelled) {
          useSyncStatus.getState().patch({
            phone: session.data.session?.user.phone ?? null,
            ready: true,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          useSyncStatus.getState().patch({ready: true});
        }
      });
    const supabase = getSupabase();
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      useSyncStatus.getState().patch({phone: session?.user.phone ?? null});
      if (session) {
        refreshRole()
          .catch(() => undefined)
          .finally(() => {
            syncNow().catch(() => undefined);
          });
      } else {
        useSyncStatus.getState().patch({role: 'owner'});
      }
    });
    return () => {
      cancelled = true;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const syncIfOnline = () => {
      syncNow().catch(() => undefined);
    };
    syncIfOnline();
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') {
        syncIfOnline();
      }
    });
    const network = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        syncIfOnline();
      }
    });
    return () => {
      appState.remove();
      network();
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !phone) {
      return;
    }
    if (!backupIsDue(lastBackupAt, new Date())) {
      return;
    }
    backupNow().catch(() => undefined);
  }, [ready, phone, lastBackupAt]);

  return null;
}
