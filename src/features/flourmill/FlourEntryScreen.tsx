import {zodResolver} from '@hookform/resolvers/zod';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Pressable, StyleSheet, Text} from 'react-native';
import {z} from 'zod';
import {
  Button,
  DateField,
  DerivedAmount,
  FormScreen,
  Segmented,
  SelectField,
  TextField,
} from '../../components';
import {database} from '../../db';
import {Q} from '@nozbe/watermelondb';
import {FlourItem, FlourTransaction} from '../../db/models';
import {loadCustomerBalances, loadGrains} from '../../db/reads';
import {rateOn} from '../../db/rates';
import {updateFlourEntry} from '../../db/updates';
import {saveFlourEntry} from '../../db/writes';
import {STANDING_LABEL} from '../../domain/labels';
import {weekdayName} from '../../domain/dates';
import {
  LedgerError,
  multiplyMoney,
  parseNumber,
  paymentStanding,
  roundMoney,
} from '../../domain/money';
import {positiveNumber} from '../../forms/fields';
import {useAsyncData} from '../../hooks/useAsyncData';
import {RootStackParamList} from '../../navigation/types';
import {colors, fonts} from '../../theme';

const schema = z.object({
  grainId: z.string().min(1, 'धान्य निवडा'),
  quantity: positiveNumber,
  customerId: z.string(),
  standing: z.enum(['paid', 'partial', 'pending']),
  paidAmount: z.string(),
  notes: z.string(),
});

type Values = z.infer<typeof schema>;

export function FlourEntryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FlourEntry'>>();
  const entryId = route.params?.entryId;
  const [date, setDate] = useState(() => new Date());
  const [rate, setRate] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const grains = useAsyncData(() => loadGrains(database), []);
  const customers = useAsyncData(() => loadCustomerBalances(database), []);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      grainId: '',
      quantity: '',
      customerId: '',
      standing: 'paid',
      paidAmount: '',
      notes: '',
    },
    mode: 'onChange',
  });
  const grainId = form.watch('grainId');
  const quantity = form.watch('quantity');
  const standing = form.watch('standing');
  const paidText = form.watch('paidAmount');
  const quantityValue = parseNumber(quantity);
  const total =
    rate != null && quantityValue != null && quantityValue > 0
      ? multiplyMoney(quantityValue, rate)
      : null;
  const paidNumber =
    standing === 'paid'
      ? total
      : standing === 'pending'
        ? total == null
          ? null
          : 0
        : parseNumber(paidText);
  const pending =
    total != null && paidNumber != null
      ? roundMoney(Math.max(0, total - paidNumber))
      : null;
  const activeGrains = grains.data.filter(grain => grain.active || grain.id === grainId);
  const grain = activeGrains.find(item => item.id === grainId);

  useEffect(() => {
    if (!entryId) {
      return;
    }
    let cancelled = false;
    Promise.all([
      database.get<FlourTransaction>('flour_transactions').find(entryId),
      database.get<FlourItem>('flour_items').query(Q.where('transaction_id', entryId)).fetch(),
    ]).then(([txn, items]) => {
      if (cancelled) {
        return;
      }
      const item = items.find(row => !row.isDeleted) ?? items[0];
      setDate(txn.date);
      form.reset({
        grainId: item?.grainId ?? '',
        quantity: item ? String(item.quantity) : '',
        customerId: txn.customerId ?? '',
        standing: paymentStanding(txn.totalAmount, txn.paidAmount),
        paidAmount: String(txn.paidAmount),
        notes: txn.notes ?? '',
      });
    });
    return () => {
      cancelled = true;
    };
  }, [entryId, form]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!grainId) {
        setRate(null);
        return () => {
          cancelled = true;
        };
      }
      rateOn(database, 'grain', grainId, date).then(next => {
        if (!cancelled) {
          setRate(next);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [date, grainId]),
  );

  async function submit(values: Values) {
    setFormError(null);
    if (total == null || paidNumber == null || rate == null) {
      setFormError(rate == null ? 'आधी या धान्याचा दर भरा' : 'प्रमाण भरा');
      return;
    }
    if (values.standing === 'partial' && (paidNumber <= 0 || paidNumber >= total)) {
      setFormError('अंशतः रक्कम एकूणपेक्षा कमी आणि शून्यापेक्षा जास्त हवी');
      return;
    }
    try {
      if (entryId) {
        await updateFlourEntry(database, entryId, {
          date,
          grainId: values.grainId,
          quantity: quantityValue ?? 0,
          customerId: values.customerId || null,
          paidAmount: values.standing === 'paid' ? total : paidNumber,
          notes: values.notes,
        });
      } else {
        await saveFlourEntry(database, {
          date,
          grainId: values.grainId,
          quantity: quantityValue ?? 0,
          customerId: values.customerId || null,
          paidAmount: values.standing === 'paid' ? total : paidNumber,
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
      <DateField value={date} onChange={setDate} />
      <Text style={styles.day}>{weekdayName(date)}</Text>
      <Controller
        control={form.control}
        name="grainId"
        render={({field, fieldState}) => (
          <SelectField
            label="धान्य"
            value={field.value}
            options={activeGrains.map(item => ({
              value: item.id,
              label: item.name,
              hint: item.unit,
            }))}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <TextField
        label="आजचा दर"
        value={rate == null ? 'दर नाही' : String(rate)}
        onChangeText={() => undefined}
        editable={false}
      />
      <Controller
        control={form.control}
        name="quantity"
        render={({field, fieldState}) => (
          <TextField
            label={`प्रमाण (${grain?.unit ?? 'किलो'})`}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            keyboardType="decimal-pad"
          />
        )}
      />
      <DerivedAmount
        label="एकूण (प्रमाण × दर)"
        amount={total}
        hint="ही रक्कम आपोआप आहे. ती हाताने भरायची नाही."
      />
      <Controller
        control={form.control}
        name="standing"
        render={({field}) => (
          <Segmented
            label="स्थिती"
            value={field.value}
            onChange={field.onChange}
            options={[
              {value: 'paid', label: STANDING_LABEL.paid},
              {value: 'partial', label: STANDING_LABEL.partial},
              {value: 'pending', label: STANDING_LABEL.pending},
            ]}
          />
        )}
      />
      {standing === 'partial' ? (
        <Controller
          control={form.control}
          name="paidAmount"
          render={({field, fieldState}) => (
            <TextField
              label="आता भरलेली रक्कम"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
              keyboardType="decimal-pad"
            />
          )}
        />
      ) : null}
      <DerivedAmount label="भरलेले" amount={paidNumber} tone="in" />
      <DerivedAmount
        label="बाकी"
        amount={pending}
        tone={pending && pending > 0 ? 'out' : 'neutral'}
        hint={
          total != null && paidNumber != null
            ? STANDING_LABEL[paymentStanding(total, paidNumber)]
            : undefined
        }
      />
      <Controller
        control={form.control}
        name="customerId"
        render={({field, fieldState}) => (
          <SelectField
            label="ग्राहक (ऐच्छिक)"
            value={field.value}
            allowEmpty
            emptyLabel="ग्राहक नाही"
            options={customers.data
              .filter(customer => customer.active)
              .map(customer => ({
                value: customer.id,
                label: customer.name,
                hint: customer.mobile,
              }))}
            onChange={value => {
              field.onChange(value);
              setFormError(null);
            }}
            error={fieldState.error?.message}
          />
        )}
      />
      <Pressable onPress={() => navigation.navigate('CustomerForm')}>
        <Text style={styles.link}>नवीन ग्राहक</Text>
      </Pressable>
      <Controller
        control={form.control}
        name="notes"
        render={({field}) => (
          <TextField
            label="टीप"
            value={field.value}
            onChangeText={field.onChange}
            multiline
          />
        )}
      />
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      {rate == null && grainId ? (
        <Button
          label="दर भरा"
          variant="secondary"
          onPress={() => navigation.navigate('GrainRates')}
        />
      ) : null}
      <Button label={entryId ? 'सुधार जतन करा' : 'जतन करा'} onPress={form.handleSubmit(submit)} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  day: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textMuted,
    marginTop: -8,
  },
  link: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.primary,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.danger,
  },
});
