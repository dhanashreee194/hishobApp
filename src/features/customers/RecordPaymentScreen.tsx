import {zodResolver} from '@hookform/resolvers/zod';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {z} from 'zod';
import {
  Button,
  DateField,
  DerivedAmount,
  FormScreen,
  RecordCard,
  SearchField,
  Segmented,
  SelectField,
  TextField,
} from '../../components';
import {database} from '../../db';
import {loadCustomerBalances, loadLedger} from '../../db/reads';
import {recordPayment} from '../../db/writes';
import {updateLedgerPayment} from '../../db/updates';
import {PAYMENT_MODE_LABEL} from '../../domain/labels';
import {LedgerError, moneyNumber, parseNumber, roundMoney, sumAmounts} from '../../domain/money';
import {positiveNumber} from '../../forms/fields';
import {useAsyncData} from '../../hooks/useAsyncData';
import {RootStackParamList} from '../../navigation/types';
import {useTx} from '../../i18n/locale';
import {colors, fonts, spacing} from '../../theme';

const schema = z.object({
  mode: z.enum(['full', 'partial']),
  amount: z.string(),
  paymentMode: z.string().min(1, 'पद्धत निवडा'),
  notes: z.string(),
});

type Values = z.infer<typeof schema>;

export function RecordPaymentScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'RecordPayment'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [date, setDate] = useState(() => new Date());
  const [formError, setFormError] = useState<string | null>(null);
  const tx = useTx();
  const ledger = useAsyncData(
    () => loadLedger(database, route.params.customerId),
    {customer: null, lines: []},
  );
  const entryId = route.params.entryId;
  const existing = ledger.data.lines.find(line => line.id === entryId);
  const rawBalance = ledger.data.customer?.balance ?? 0;
  const balance = existing
    ? moneyNumber(sumAmounts([rawBalance, existing.amount]))
    : rawBalance;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {mode: 'full', amount: '', paymentMode: 'cash', notes: ''},
    mode: 'onChange',
  });
  const mode = form.watch('mode');
  const typed = parseNumber(form.watch('amount'));
  const paying = mode === 'full' ? (balance > 0 ? balance : null) : typed;
  const remaining =
    paying != null ? roundMoney(Math.max(0, balance - paying)) : null;

  useEffect(() => {
    if (!existing) {
      return;
    }
    setDate(new Date(existing.date));
    form.reset({
      mode: 'partial',
      amount: String(existing.amount),
      paymentMode: existing.paymentMode ?? 'cash',
      notes: existing.notes ?? '',
    });
  }, [existing, form]);

  async function submit(values: Values) {
    setFormError(null);
    const amount = values.mode === 'full' ? balance : parseNumber(values.amount);
    if (amount == null) {
      setFormError('रक्कम भरा');
      return;
    }
    if (values.mode === 'partial') {
      const parsed = positiveNumber.safeParse(values.amount);
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? 'रक्कम भरा');
        return;
      }
    }
    try {
      if (entryId) {
        await updateLedgerPayment(database, entryId, {
          date,
          amount,
          paymentMode: values.paymentMode,
          notes: values.notes,
        });
      } else {
        await recordPayment(database, {
          customerId: route.params.customerId,
          date,
          amount,
          paymentMode: values.paymentMode,
          notes: values.notes,
        });
      }
      navigation.goBack();
    } catch (error) {
      setFormError(error instanceof LedgerError ? error.message : 'जतन करता आले नाही');
    }
  }

  return (
    <FormScreen>
      <Text style={styles.name}>{ledger.data.customer?.name ?? tx('ग्राहक')}</Text>
      <DerivedAmount label="सध्याची बाकी" amount={balance} tone="out" />
      <DateField value={date} onChange={setDate} />
      <Controller
        control={form.control}
        name="mode"
        render={({field}) => (
          <Segmented
            label="पेमेंट"
            value={field.value}
            onChange={field.onChange}
            options={[
              {value: 'full', label: 'पूर्ण'},
              {value: 'partial', label: 'अंशतः'},
            ]}
          />
        )}
      />
      {mode === 'partial' ? (
        <Controller
          control={form.control}
          name="amount"
          render={({field, fieldState}) => (
            <TextField
              label="जमा रक्कम"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
              keyboardType="decimal-pad"
            />
          )}
        />
      ) : null}
      <Controller
        control={form.control}
        name="paymentMode"
        render={({field, fieldState}) => (
          <SelectField
            label="पद्धत"
            value={field.value}
            options={Object.entries(PAYMENT_MODE_LABEL).map(([value, label]) => ({
              value,
              label: tx(label),
            }))}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <DerivedAmount
        label="जमा होणारी रक्कम"
        amount={paying}
        tone="in"
        hint="ही रक्कम आपोआप शिलकीवरून काढली जाते."
      />
      <DerivedAmount label="पेमेंट नंतरची बाकी" amount={remaining} tone="out" />
      <Controller
        control={form.control}
        name="notes"
        render={({field}) => (
          <TextField label="टीप" value={field.value} onChangeText={field.onChange} />
        )}
      />
      {formError ? <Text style={styles.error}>{tx(formError)}</Text> : null}
      <Button label={entryId ? 'सुधार जतन करा' : 'पेमेंट जतन करा'} onPress={form.handleSubmit(submit)} />
    </FormScreen>
  );
}

export function ReceivePaymentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tx = useTx();
  const [query, setQuery] = useState('');
  const customers = useAsyncData(() => loadCustomerBalances(database), []);
  const visible = customers.data.filter(customer => {
    if (customer.balance <= 0) {
      return false;
    }
    const q = query.trim();
    if (!q) {
      return true;
    }
    return customer.name.includes(q) || customer.mobile.includes(q);
  });

  return (
    <View style={styles.screen}>
      <SearchField value={query} onChangeText={setQuery} placeholder="ग्राहक शोधा" />
      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.error}>{tx('बाकी असलेला ग्राहक नाही.')}</Text>}
        renderItem={({item}) => (
          <RecordCard
            title={item.name}
            subtitle={item.mobile}
            amount={item.balance}
            amountHint="बाकी"
            tone="out"
            onPress={() => navigation.navigate('RecordPayment', {customerId: item.id})}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  name: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.danger,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
