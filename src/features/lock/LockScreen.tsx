import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button, TextField} from '../../components';
import {biometryAvailable, readLock, unlockWithBiometric, unlockWithPin} from '../../security/lock';
import {useTx} from '../../i18n/locale';
import {colors, fonts, spacing, typography} from '../../theme';

type Props = {
  onUnlock: () => void;
};

export function LockScreen({onUnlock}: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometric, setBiometric] = useState(false);
  const [busy, setBusy] = useState(false);
  const tx = useTx();

  useEffect(() => {
    let cancelled = false;
    Promise.all([readLock(), biometryAvailable()]).then(([status, available]) => {
      if (!cancelled) {
        setBiometric(status.biometric && available);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitPin() {
    setBusy(true);
    const ok = await unlockWithPin(pin);
    setBusy(false);
    if (ok) {
      onUnlock();
      return;
    }
    setError('पिन चुकीचा आहे');
  }

  async function submitBiometric() {
    setBusy(true);
    const ok = await unlockWithBiometric();
    setBusy(false);
    if (ok) {
      onUnlock();
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={typography.heading}>{tx('माझा हिशोब')}</Text>
      <Text style={styles.help}>{tx('अॅप उघडण्यासाठी पिन टाका.')}</Text>
      <TextField
        label="पिन"
        value={pin}
        onChangeText={value => {
          setPin(value.replace(/\D/g, '').slice(0, 6));
          setError(null);
        }}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        error={error ?? undefined}
      />
      <Button label="उघडा" onPress={submitPin} disabled={busy || pin.length < 4} />
      {biometric ? (
        <Button label="बोटाचा ठसा" variant="secondary" onPress={submitBiometric} disabled={busy} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  help: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
});
