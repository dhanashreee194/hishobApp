import {zodResolver} from '@hookform/resolvers/zod';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {StyleSheet, Text} from 'react-native';
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
import {Expense} from '../../db/models';
import {loadCategories} from '../../db/reads';
import {updateExpense} from '../../db/updates';
import {saveExpense} from '../../db/writes';
import {BUSINESS_LABEL} from '../../domain/labels';
import {LedgerError, parseNumber} from '../../domain/money';
import {positiveNumber} from '../../forms/fields';
import {useAsyncData} from '../../hooks/useAsyncData';
import {RootStackParamList} from '../../navigation/types';
import {useCopy, useTx} from '../../i18n/locale';
import {colors, fonts} from '../../theme';

const schema = z.object({
  businessType: z.enum(['flour', 'vegetable', 'milk', 'general']),
  categoryId: z.string().min(1, 'प्रकार निवडा'),
  amount: positiveNumber,
  allocationType: z.enum(['own', 'shared']),
  notes: z.string(),
});

type Values = z.infer<typeof schema>;

export function ExpensesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ExpenseEntry'>>();
  const expenseId = route.params?.expenseId;
  const [date, setDate] = useState(() => new Date());
  const [formError, setFormError] = useState<string | null>(null);
  const copy = useCopy();
  const tx = useTx();
  const categories = useAsyncData(() => loadCategories(database), []);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessType: 'general',
      categoryId: '',
      amount: '',
      allocationType: 'own',
      notes: '',
    },
    mode: 'onChange',
  });
  const amount = parseNumber(form.watch('amount'));
  const categoryId = form.watch('categoryId');
  const active = categories.data.filter(item => item.active || item.id === categoryId);

  useEffect(() => {
    if (!expenseId) {
      return;
    }
    let cancelled = false;
    database
      .get<Expense>('expenses')
      .find(expenseId)
      .then(entry => {
        if (cancelled) {
          return;
        }
        setDate(entry.date);
        const businessType = ['flour', 'vegetable', 'milk', 'general'].includes(entry.businessType)
          ? (entry.businessType as Values['businessType'])
          : 'general';
        const allocationType = entry.allocationType === 'shared' ? 'shared' : 'own';
        form.reset({
          businessType,
          categoryId: entry.categoryId ?? '',
          amount: String(entry.amount),
          allocationType,
          notes: entry.notes ?? '',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [expenseId, form]);

  async function submit(values: Values) {
    setFormError(null);
    try {
      if (expenseId) {
        await updateExpense(database, expenseId, {
          date,
          businessType: values.businessType,
          categoryId: values.categoryId,
          amount: parseNumber(values.amount) ?? 0,
          allocationType: values.allocationType,
          notes: values.notes,
        });
      } else {
        await saveExpense(database, {
          date,
          businessType: values.businessType,
          categoryId: values.categoryId,
          amount: parseNumber(values.amount) ?? 0,
          allocationType: values.allocationType,
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
      <Text style={styles.day}>{copy.weekdays[date.getDay()]}</Text>
      <Controller
        control={form.control}
        name="businessType"
        render={({field}) => (
          <SelectField
            label="व्यवसाय"
            value={field.value}
            options={Object.entries(BUSINESS_LABEL).map(([value, label]) => ({
              value,
              label: tx(label),
            }))}
            onChange={value => field.onChange(value)}
          />
        )}
      />
      <Controller
        control={form.control}
        name="categoryId"
        render={({field, fieldState}) => (
          <SelectField
            label="खर्च प्रकार"
            value={field.value}
            options={active.map(item => ({value: item.id, label: item.name}))}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={form.control}
        name="amount"
        render={({field, fieldState}) => (
          <TextField
            label="रक्कम"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            keyboardType="decimal-pad"
          />
        )}
      />
      <Controller
        control={form.control}
        name="allocationType"
        render={({field}) => (
          <Segmented
            label="वाटप"
            value={field.value}
            onChange={field.onChange}
            options={[
              {value: 'own', label: 'स्वतः'},
              {value: 'shared', label: 'सामाईक'},
            ]}
          />
        )}
      />
      <DerivedAmount
        label="जतन होणारी रक्कम"
        amount={amount != null && amount > 0 ? amount : null}
        tone="out"
        hint="खर्च हाताने भरायचा आहे. वरची रक्कम जतन होण्यापूर्वी तपासा."
      />
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
      {formError ? <Text style={styles.error}>{tx(formError)}</Text> : null}
      <Button
        label={expenseId ? 'सुधार जतन करा' : 'खर्च जतन करा'}
        onPress={form.handleSubmit(submit)}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  day: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textMuted,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.danger,
  },
});
