import React, {useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import {Button, TextField} from '../../components';
import {acceptInvite, inviteAssistant} from '../../sync/role';
import {isCloudConfigured} from '../../sync/publicConfig';
import {syncNow} from '../../sync/synchronize';
import {useSyncStatus} from '../../sync/status';
import {useTx} from '../../i18n/locale';
import {colors, fonts} from '../../theme';

export function TeamSection() {
  const phone = useSyncStatus(state => state.phone);
  const role = useSyncStatus(state => state.role);
  const [assistantPhone, setAssistantPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isCloudConfigured();
  const tx = useTx();

  async function invite() {
    setBusy(true);
    setMessage(null);
    try {
      await inviteAssistant(assistantPhone);
      setAssistantPhone('');
      setMessage('आमंत्रण जतन झाले. सहाय्यक या फोनने साइन इन करून स्वीकारेल.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'आमंत्रण जतन झाले नाही.');
    } finally {
      setBusy(false);
    }
  }

  function accept() {
    Alert.alert(
      tx('आमंत्रण'),
      tx('हे खाते त्या मालकाचे सहाय्यक होईल. क्लाउडवरील हिशोब त्या मालकाचा दिसेल.'),
      [
        {text: tx('रद्द'), style: 'cancel'},
        {
          text: tx('स्वीकारा'),
          onPress: () => {
            setBusy(true);
            acceptInvite()
              .then(async next => {
                setMessage(next === 'assistant' ? 'तुम्ही सहाय्यक आहात.' : 'या फोनसाठी आमंत्रण नाही.');
                await syncNow();
              })
              .catch((error: unknown) => {
                setMessage(error instanceof Error ? error.message : 'आमंत्रण स्वीकारता आले नाही.');
              })
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  }

  if (!configured) {
    return (
      <Text style={styles.help}>
        {tx('क्लाउड जोडणी नसताना एकच मालक. सहाय्यक जोडण्यासाठी फोन प्रवेश आणि SQL हवे.')}
      </Text>
    );
  }

  return (
    <>
      <Text style={styles.heading}>{tx('वापरकर्ते')}</Text>
      <Text style={styles.help}>
        {role === 'assistant'
          ? tx('तुम्ही सहाय्यक आहात. बॅकअप, रिस्टोअर, भागीदार बदल आणि बाकी स्मरण मालकाकडे आहेत.')
          : tx('तुम्ही मालक आहात. सहाय्यक नोंदी करू शकतो. बॅकअप आणि भागीदार बदल तुमच्याकडे राहतात.')}
      </Text>
      {phone && role === 'owner' ? (
        <>
          <TextField
            label="सहाय्यकाचा मोबाइल"
            value={assistantPhone}
            onChangeText={setAssistantPhone}
            keyboardType="phone-pad"
            placeholder="98XXXXXXXX"
          />
          <Button label={busy ? 'जतन होत आहे…' : 'आमंत्रित करा'} onPress={invite} disabled={busy} />
          <Button label="आमंत्रण स्वीकारा" variant="secondary" onPress={accept} disabled={busy} />
        </>
      ) : null}
      {message ? <Text style={styles.message}>{tx(message)}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
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
  message: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.primary,
  },
});
