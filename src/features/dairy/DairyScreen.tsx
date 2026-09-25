import {zodResolver} from '@hookform/resolvers/zod';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {StyleSheet, Text} from 'react-native';
import {z} from 'zod';
import {
  Button,
  DateField,
  DerivedAmount,
  FilterBanner,
  RecordList,
  RecordCard,
  SearchField,
  SuggestField,
  TextField,
} from '../../components';
import {database} from '../../db';
import {confirmDelete} from '../records/confirmDelete';
import {loadMilkList, loadSupplierNames} from '../../db/reads';
import {rateOn} from '../../db/rates';
import {saveMilkEntry} from '../../db/writes';
import {updateMilkEntry} from '../../db/updates';
import {weekdayName} from '../../domain/dates';
import {MILK_RATE_ITEM_ID} from '../../domain/labels';
import {includesText, inDateRange} from '../../domain/listFilter';
import {LedgerError, multiplyMoney, parseNumber} from '../../domain/money';
import {positiveNumber, requiredName} from '../../forms/fields';
import {useAsyncData} from '../../hooks/useAsyncData';
import {useListFilter} from '../../hooks/useListFilter';
import {RootStackParamList} from '../../navigation/types';
import {colors, fonts, formatIndianDate} from '../../theme';

const schema = z.object({
  supplier: requiredName,
  litres: positiveNumber,
});

type Values = z.infer<typeof schema>;

export function DairyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Dairy'>>();
  const filter = useListFilter(route.params?.filter);
  const [date, setDate] = useState(() => new Date());
  const [rate, setRate] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const suppliers = useAsyncData(() => loadSupplierNames(database), []);
  const entries = useAsyncData(() => loadMilkList(database), []);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {supplier: '', litres: ''},
    mode: 'onChange',
  });
  const litres = parseNumber(form.watch('litres'));
  const total =
    rate != null && litres != null && litres > 0 ? multiplyMoney(litres, rate) : null;
  const visible = useMemo(
    () =>
      entries.data.filter(item => {
        if (!inDateRange(item.date, filter)) {
          return false;
        }
        if (!filter.text.trim()) {
          return true;
        }
        return (
          includesText(item.supplier, filter.text) ||
          formatIndianDate(new Date(item.date)).includes(filter.text.trim())
        );
      }),
    [entries.data, filter],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      rateOn(database, 'milk', MILK_RATE_ITEM_ID, date).then(next => {
        if (!cancelled) {
          setRate(next);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [date]),
  );

  useEffect(() => {
    const id = route.params?.entryId;
    if (!id) {
      return;
    }
    const row = entries.data.find(item => item.id === id);
    if (!row) {
      return;
    }
    setEditingId(id);
    setDate(new Date(row.date));
    form.reset({supplier: row.supplier, litres: String(row.litres)});
    navigation.setParams({entryId: undefined});
  }, [entries.data, form, navigation, route.params?.entryId]);

  async function submit(values: Values) {
    setFormError(null);
    try {
      if (editingId) {
        await updateMilkEntry(database, editingId, {
          date,
          supplier: values.supplier,
          litres: parseNumber(values.litres) ?? 0,
        });
        setEditingId(null);
      } else {
        await saveMilkEntry(database, {
          date,
          supplier: values.supplier,
          litres: parseNumber(values.litres) ?? 0,
        });
      }
      form.reset({supplier: '', litres: ''});
      await entries.reload();
      await suppliers.reload();
    } catch (error) {
      setFormError(error instanceof LedgerError ? error.message : 'जतन करता आले नाही');
    }
  }

  return (
    <RecordList
      data={visible}
      keyExtractor={item => item.id}
      empty={
        filter.text || filter.from != null || filter.to != null
          ? 'या शोधात काही सापडले नाही.'
          : 'अजून दूध नोंद नाही.'
      }
      renderItem={({item}) => (
        <RecordCard
          title={`${formatIndianDate(new Date(item.date))} ${weekdayName(new Date(item.date))}`}
          subtitle={`${item.supplier} · ${item.litres} लि × ${item.rate}`}
          amount={item.amount}
          tone="out"
          onEdit={() => {
            setEditingId(item.id);
            setDate(new Date(item.date));
            form.reset({supplier: item.supplier, litres: String(item.litres)});
          }}
          onDelete={() => confirmDelete('milk_entries', item.id, entries.reload)}
        />
      )}
      header={
        <>
      <Button
        label="दूध दर"
        variant="secondary"
        onPress={() => navigation.navigate('MilkRates')}
      />
      <DateField value={date} onChange={setDate} />
      <Text style={styles.day}>{weekdayName(date)}</Text>
      <Controller
        control={form.control}
        name="supplier"
        render={({field, fieldState}) => (
          <SuggestField
            label="पुरवठादार"
            value={field.value}
            onChangeText={field.onChange}
            suggestions={suppliers.data}
            error={fieldState.error?.message}
            placeholder="नाव लिहा"
          />
        )}
      />
      <Controller
        control={form.control}
        name="litres"
        render={({field, fieldState}) => (
          <TextField
            label="लिटर"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            keyboardType="decimal-pad"
          />
        )}
      />
      <DerivedAmount
        label="एकूण (लिटर × दर)"
        amount={total}
        hint={rate == null ? 'आधी दूध दर भरा' : `दर ${rate} · ही रक्कम आपोआप आहे`}
        tone="out"
      />
      {editingId ? <Text style={styles.day}>ही दूध नोंद सुधारत आहात.</Text> : null}
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button
        label={editingId ? 'सुधार जतन करा' : 'दूध नोंद जतन करा'}
        onPress={form.handleSubmit(submit)}
      />
      {editingId ? (
        <Button
          label="रद्द"
          variant="secondary"
          onPress={() => {
            setEditingId(null);
            form.reset({supplier: '', litres: ''});
          }}
        />
      ) : null}
      <SearchField
        value={filter.text}
        onChangeText={filter.setText}
        placeholder="पुरवठादार किंवा तारीख"
      />
      <FilterBanner
        from={filter.from}
        to={filter.to}
        onClear={() => navigation.setParams({filter: undefined})}
      />
        </>
      }
    />
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
