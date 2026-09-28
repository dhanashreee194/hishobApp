import React, {useState} from 'react';
import {StyleSheet, Text} from 'react-native';
import {Button, TextField} from '../../components';
import {getSupabase} from '../../sync/client';
import {toE164} from '../../sync/phone';
import {useTx} from '../../i18n/locale';
import {colors, fonts} from '../../theme';

type Props = {
  onSignedIn?: () => void;
};

export function PhoneAuthForm({onSignedIn}: Props) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tx = useTx();

  async function sendCode() {
    const supabase = getSupabase();
    const e164 = toE164(phone);
    if (!supabase || !e164) {
      setError('दहा अंकी मोबाइल नंबर टाका.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await supabase.auth.signInWithOtp({phone: e164});
      if (result.error) {
        throw result.error;
      }
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'OTP गेला नाही.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const supabase = getSupabase();
    const e164 = toE164(phone);
    if (!supabase || !e164 || otp.trim().length < 4) {
      setError('OTP तपासा.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await supabase.auth.verifyOtp({
        phone: e164,
        token: otp.trim(),
        type: 'sms',
      });
      if (result.error) {
        throw result.error;
      }
      onSignedIn?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'प्रवेश झाला नाही.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Text style={styles.help}>
        {tx('फोनवर OTP येईल. नेटवर्क नसेल तर हिशोब ऑफलाइन चालू राहतो.')}
      </Text>
      <TextField
        label="मोबाइल"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="98XXXXXXXX"
      />
      {sent ? (
        <TextField
          label="OTP"
          value={otp}
          onChangeText={value => setOtp(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="6 अंक"
        />
      ) : null}
      {error ? <Text style={styles.error}>{tx(error)}</Text> : null}
      {sent ? (
        <Button label={busy ? 'तपासत आहे…' : 'प्रवेश करा'} onPress={verify} disabled={busy} />
      ) : (
        <Button label={busy ? 'पाठवत आहे…' : 'OTP पाठवा'} onPress={sendCode} disabled={busy} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  help: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.danger,
  },
});
