import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useCallback, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {Button, TextField} from '../../components';
import {FormScreen} from '../../components/FormScreen';
import {RootStackParamList} from '../../navigation/types';
import {PhoneAuthForm} from '../auth/PhoneAuthForm';
import {AppLockSection} from '../lock/AppLockSection';
import {TeamSection} from './TeamSection';
import {
  BackupFile,
  BackupPinRequired,
  backupNow,
  exportLocalBackup,
  listBackups,
  listLocalBackups,
  restoreBackup,
  restoreLocalBackup,
} from '../../sync/backup';
import {getSupabase} from '../../sync/client';
import {isCloudConfigured} from '../../sync/publicConfig';
import {syncNow} from '../../sync/synchronize';
import {formatStamp, useSyncStatus} from '../../sync/status';
import {colors, fonts, spacing} from '../../theme';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const phone = useSyncStatus(state => state.phone);
  const lastSyncedAt = useSyncStatus(state => state.lastSyncedAt);
  const lastBackupAt = useSyncStatus(state => state.lastBackupAt);
  const syncing = useSyncStatus(state => state.syncing);
  const backingUp = useSyncStatus(state => state.backingUp);
  const syncError = useSyncStatus(state => state.syncError);
  const backupError = useSyncStatus(state => state.backupError);
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [localFiles, setLocalFiles] = useState<BackupFile[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pinTarget, setPinTarget] = useState<{kind: 'cloud' | 'local'; path: string} | null>(null);
  const configured = isCloudConfigured();
  const assistant = useSyncStatus(state => state.role === 'assistant');

  const refreshFiles = useCallback(() => {
    listLocalBackups()
      .then(setLocalFiles)
      .catch(() => setLocalFiles([]));
    if (!configured || !phone) {
      setFiles([]);
      return;
    }
    listBackups()
      .then(setFiles)
      .catch(() => setListError('बॅकअप यादी उघडली नाही. स्थानिक हिशोब सुरू आहे.'));
  }, [configured, phone]);

  useFocusEffect(
    useCallback(() => {
      refreshFiles();
    }, [refreshFiles]),
  );

  function restoreError(error: unknown, target: {kind: 'cloud' | 'local'; path: string}) {
    if (error instanceof BackupPinRequired) {
      setPinTarget(target);
      setListError('या बॅकअपसाठी पिन टाका.');
      return;
    }
    setListError(
      error instanceof Error && error.message
        ? error.message
        : 'रिस्टोअर झाले नाही. स्थानिक हिशोब जसा होता तसा आहे.',
    );
  }

  function runRestore(target: {kind: 'cloud' | 'local'; path: string}, pinValue?: string) {
    setRestoring(target.path);
    const action =
      target.kind === 'cloud'
        ? restoreBackup(target.path, pinValue)
        : restoreLocalBackup(target.path, pinValue);
    action
      .then(() => {
        setPinTarget(null);
        setPin('');
        return syncNow();
      })
      .catch((error: unknown) => restoreError(error, target))
      .finally(() => setRestoring(null));
  }

  function confirmRestore(file: BackupFile, kind: 'cloud' | 'local') {
    const target = {kind, path: file.path};
    Alert.alert(
      'रिस्टोअर',
      `${file.name} मधून स्थानिक हिशोब बदलेल. चालू नोंदी या प्रतमध्ये नसतील तर त्या जाऊ शकतात.`,
      [
        {text: 'रद्द', style: 'cancel'},
        {
          text: 'रिस्टोअर',
          style: 'destructive',
          onPress: () => runRestore(target),
        },
      ],
    );
  }

  async function signOut() {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
    useSyncStatus.getState().patch({phone: null, role: 'owner'});
    setFiles([]);
  }

  return (
    <FormScreen>
      <View style={styles.stack}>
      <AppLockSection />
      {assistant ? null : (
      <Button
        label="काढलेल्या नोंदी"
        variant="secondary"
        onPress={() => navigation.navigate('DeletedRecords')}
      />
      )}
      <TeamSection />
      {assistant ? null : (
        <>
          <Text style={styles.heading}>स्थानिक बॅकअप</Text>
          <Text style={styles.help}>
            फाइल एन्क्रिप्टेड असते. हाच फोन किल्लीने उघडतो. पिन सेट असेल तर दुसऱ्या फोनवर तो पिन लागतो.
          </Text>
          <Button
            label={backingUp ? 'बॅकअप होत आहे…' : 'स्थानिक बॅकअप फाइल'}
            onPress={() => exportLocalBackup().then(() => refreshFiles())}
            disabled={backingUp}
          />
          {localFiles.map(file => (
            <Button
              key={file.path}
              label={restoring === file.path ? 'रिस्टोअर होत आहे…' : file.name}
              variant="secondary"
              disabled={restoring != null}
              onPress={() => confirmRestore(file, 'local')}
            />
          ))}
        </>
      )}
      <Text style={styles.heading}>क्लाउड</Text>
      <View style={styles.card}>
        <Text style={styles.line}>शेवटचा सिंक: {syncing ? 'चालू आहे…' : formatStamp(lastSyncedAt)}</Text>
        <Text style={styles.line}>
          शेवटचा बॅकअप: {backingUp ? 'चालू आहे…' : formatStamp(lastBackupAt)}
        </Text>
        {phone ? <Text style={styles.line}>फोन: {phone}</Text> : null}
        {syncError ? <Text style={styles.error}>{syncError}</Text> : null}
        {backupError ? <Text style={styles.error}>{backupError}</Text> : null}
      </View>
      {!configured ? (
        <Text style={styles.help}>
          क्लाउड जोडणी सेट नाही. अॅप पूर्ण ऑफलाइन चालतो. Supabase URL आणि anon key
          src/sync/publicConfig.ts मध्ये टाका.
        </Text>
      ) : null}
      {configured && !phone ? <PhoneAuthForm onSignedIn={refreshFiles} /> : null}
      {configured && phone ? (
        <>
          <Button label="आत्ता सिंक" variant="secondary" onPress={() => syncNow()} disabled={syncing} />
          {assistant ? null : (
            <Button
              label={backingUp ? 'बॅकअप होत आहे…' : 'आत्ता बॅकअप'}
              onPress={() => backupNow().then(refreshFiles)}
              disabled={backingUp}
            />
          )}
          <Button label="बाहेर पडा" variant="secondary" onPress={signOut} />
          {assistant ? null : (
            <>
              <Text style={styles.heading}>रिस्टोअर</Text>
              {listError ? <Text style={styles.error}>{listError}</Text> : null}
              {files.length === 0 ? <Text style={styles.help}>अजून क्लाउड बॅकअप नाही.</Text> : null}
              {files.map(file => (
                <Button
                  key={file.path}
                  label={restoring === file.path ? 'रिस्टोअर होत आहे…' : file.name}
                  variant="secondary"
                  disabled={restoring != null}
                  onPress={() => confirmRestore(file, 'cloud')}
                />
              ))}
            </>
          )}
        </>
      ) : null}
      {pinTarget ? (
        <>
          <TextField
            label="बॅकअप पिन"
            value={pin}
            onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
          />
          <Button
            label="पिनने रिस्टोअर"
            onPress={() => runRestore(pinTarget, pin)}
            disabled={restoring != null || pin.length < 4}
          />
        </>
      ) : null}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  stack: {gap: spacing.md},
  heading: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  line: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  help: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.danger,
  },
});
