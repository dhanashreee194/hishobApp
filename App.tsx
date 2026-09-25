import {DatabaseProvider} from '@nozbe/watermelondb/react';
import {NavigationContainer} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, AppState, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {database, prepareDatabase} from './src/db';
import {OnboardingScreen} from './src/features/auth/OnboardingScreen';
import {LockScreen} from './src/features/lock/LockScreen';
import {RootNavigator} from './src/navigation/RootNavigator';
import {readLock} from './src/security/lock';
import {useAppStore} from './src/store/useAppStore';
import {isCloudConfigured} from './src/sync/publicConfig';
import {SyncController} from './src/sync/SyncController';
import {useSyncStatus} from './src/sync/status';
import {hydrateLocale} from './src/i18n/locale';
import {colors, spacing, typography} from './src/theme';

function App() {
  const databaseReady = useAppStore(state => state.databaseReady);
  const seedError = useAppStore(state => state.seedError);
  const setDatabaseReady = useAppStore(state => state.setDatabaseReady);
  const setSeedError = useAppStore(state => state.setSeedError);
  const syncReady = useSyncStatus(state => state.ready);
  const phone = useSyncStatus(state => state.phone);
  const skippedAuth = useSyncStatus(state => state.skippedAuth);
  const needsOnboarding = isCloudConfigured() && syncReady && !phone && !skippedAuth;
  const [lockChecked, setLockChecked] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    prepareDatabase()
      .then(() => hydrateLocale())
      .then(() => {
        if (!cancelled) {
          setDatabaseReady(true);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSeedError(
            error instanceof Error ? error.message : 'डेटाबेस उघडता आला नाही',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [setDatabaseReady, setSeedError]);

  useEffect(() => {
    if (!databaseReady) {
      return;
    }
    let cancelled = false;
    readLock()
      .then(status => {
        if (!cancelled) {
          setLocked(status.enabled);
          setLockChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocked(false);
          setLockChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [databaseReady]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'background') {
        return;
      }
      readLock()
        .then(status => {
          if (status.enabled) {
            setLocked(true);
          }
        })
        .catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <DatabaseProvider database={database}>
        {seedError ? (
          <View style={styles.center}>
            <Text style={typography.heading}>डेटाबेस त्रुटी</Text>
            <Text style={typography.body}>{seedError}</Text>
          </View>
        ) : databaseReady && !lockChecked ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : databaseReady && locked ? (
          <>
            <SyncController />
            <LockScreen onUnlock={() => setLocked(false)} />
          </>
        ) : databaseReady ? (
          <>
            <SyncController />
            {!syncReady ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : needsOnboarding ? (
              <OnboardingScreen onContinue={() => undefined} />
            ) : (
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
            )}
          </>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={typography.body}>हिशोब तयार होत आहे…</Text>
          </View>
        )}
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
});

export default App;
