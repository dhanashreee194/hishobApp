import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button, TextField} from '../../components';
import {
  biometryAvailable,
  changeLockPin,
  disableLock,
  enableLock,
  readLock,
  setBiometricEnabled,
} from '../../security/lock';
import {useTx} from '../../i18n/locale';
import {colors, fonts, spacing} from '../../theme';

export function AppLockSection() {
  const [enabled, setEnabled] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [pin, setPin] = useState('');
  const [again, setAgain] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tx = useTx();

  const refresh = useCallback(() => {
    Promise.all([readLock(), biometryAvailable()])
      .then(([status, available]) => {
        setEnabled(status.enabled);
        setBiometric(status.biometric);
        setCanUseBiometric(available);
      })
      .catch(() => setError('अॅप लॉक वाचता आला नाही'));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function clearPins() {
    setPin('');
    setAgain('');
    setNextPin('');
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      clearPins();
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'अॅप लॉक बदलता आला नाही');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.stack}>
      <Text style={styles.heading}>{tx('अॅप लॉक')}</Text>
      <Text style={styles.help}>
        {tx(
          'ऐच्छिक. पिन किंवा बोटाचा ठसा फक्त अॅप उघडताना विचारतो. आतील पाने वेगळी कुलूपबंद होत नाहीत. पिन नसेल तर अॅप थेट उघडतो.',
        )}
      </Text>
      {enabled ? (
        <>
          <TextField
            label="सध्याचा पिन"
            value={pin}
            onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
          />
          <TextField
            label="नवीन पिन"
            value={nextPin}
            onChangeText={value => setNextPin(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
          />
          <Button
            label="पिन बदला"
            onPress={() => run(() => changeLockPin(pin, nextPin))}
            disabled={busy || pin.length < 4 || nextPin.length < 4}
          />
          <Button
            label="अॅप लॉक काढा"
            variant="secondary"
            onPress={() => run(() => disableLock(pin))}
            disabled={busy || pin.length < 4}
          />
          <Button
            label={biometric ? 'बोटाचा ठसा बंद करा' : 'बोटाचा ठसा चालू करा'}
            variant="secondary"
            onPress={() => run(() => setBiometricEnabled(!biometric))}
            disabled={busy}
          />
          {!canUseBiometric ? (
            <Text style={styles.help}>{tx('या फोनवर बोटाचा ठसा उपलब्ध नाही. पिन चालतो.')}</Text>
          ) : null}
        </>
      ) : (
        <>
          <TextField
            label="नवीन पिन"
            value={pin}
            onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
          />
          <TextField
            label="पिन पुन्हा"
            value={again}
            onChangeText={value => setAgain(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
          />
          <Button
            label="अॅप लॉक सेट करा"
            onPress={() =>
              run(async () => {
                if (pin !== again) {
                  throw new Error('दोन्ही पिन सारखे हवे');
                }
                await enableLock(pin);
              })
            }
            disabled={busy || pin.length < 4}
          />
        </>
      )}
      {error ? <Text style={styles.error}>{tx(error)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {gap: spacing.md},
  heading: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },
  help: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.danger,
  },
});
