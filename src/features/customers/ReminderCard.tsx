import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button, TextField} from '../../components';
import {database} from '../../db';
import {Customer} from '../../db/models';
import {CustomerLedgerEntry} from '../../db/models';
import {notDeleted} from '../../db/queries';
import {overdueCustomers} from '../../domain/overdue';
import {useAsyncData} from '../../hooks/useAsyncData';
import {isCloudConfigured} from '../../sync/publicConfig';
import {sendUdhariReminders, type ReminderChannel} from '../../sync/reminders';
import {useSyncStatus} from '../../sync/status';
import {colors, fonts, formatExactRupees, spacing} from '../../theme';

export function ReminderCard() {
  const [days, setDays] = useState('15');
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState<ReminderChannel | null>(null);
  const role = useSyncStatus(state => state.role);
  const configured = isCloudConfigured();
  const parsedDays = Math.min(365, Math.max(1, Number(days) || 15));
  const preview = useAsyncData(
    async () => {
      const customers = await database.get<Customer>('customers').query().fetch();
      const entries = await database
        .get<CustomerLedgerEntry>('customer_ledger_entries')
        .query(notDeleted())
        .fetch();
      return overdueCustomers(
        customers.map(customer => ({
          id: customer.id,
          name: customer.name,
          mobile: customer.mobile ?? '',
        })),
        entries.map(entry => ({
          customerId: entry.customerId,
          date: entry.date.getTime(),
          type: entry.type,
          amount: String(entry.amount),
        })),
        parsedDays,
        new Date(),
      );
    },
    [],
  );

  useEffect(() => {
    preview.reload();
  }, [parsedDays, preview.reload]);

  async function send(channel: ReminderChannel) {
    setSending(channel);
    setMessage(null);
    try {
      const result = await sendUdhariReminders(parsedDays, channel);
      setMessage(
        `${result.sent} संदेश गेले. ${result.skipped} वगळले. ${result.missingPhone} जणांचा मोबाइल नाही.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'संदेश गेले नाहीत.');
    } finally {
      setSending(null);
    }
  }

  if (role === 'assistant') {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>बाकी स्मरण</Text>
      <Text style={styles.help}>
        ज्यांची सर्वात जुनी बाकी इतक्या दिवसांपेक्षा जास्त आहे. पाठवणे क्लाउड फंक्शन करते. Twilio किंवा
        WhatsApp गुपिते अॅपमध्ये नाहीत.
      </Text>
      <TextField
        label="दिवस"
        value={days}
        onChangeText={value => setDays(value.replace(/\D/g, '').slice(0, 3))}
        keyboardType="number-pad"
      />
      {preview.data.length === 0 ? (
        <Text style={styles.help}>या मुदतीत कोणाची बाकी नाही.</Text>
      ) : (
        preview.data.map(customer => (
          <Text key={customer.customerId} style={styles.line}>
            {customer.name} · {customer.daysOverdue} दिवस · {formatExactRupees(customer.balance)}
            {customer.mobile ? '' : ' · मोबाइल नाही'}
          </Text>
        ))
      )}
      <View style={styles.actions}>
        <Button
          label={sending === 'sms' ? 'पाठवत आहे…' : 'SMS'}
          onPress={() => send('sms')}
          disabled={!configured || sending != null}
          style={styles.action}
        />
        <Button
          label={sending === 'whatsapp' ? 'पाठवत आहे…' : 'WhatsApp'}
          variant="secondary"
          onPress={() => send('whatsapp')}
          disabled={!configured || sending != null}
          style={styles.action}
        />
      </View>
      {!configured ? (
        <Text style={styles.help}>क्लाउड जोडणी नसताना यादी दिसते, संदेश जात नाहीत.</Text>
      ) : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
  },
  help: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  line: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {flex: 1},
  message: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.primary,
  },
});
