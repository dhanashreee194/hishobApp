import {zodResolver} from '@hookform/resolvers/zod';
import {CompositeNavigationProp, RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useMemo, useState} from 'react';
import {Controller, useFieldArray, useForm} from 'react-hook-form';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {z} from 'zod';
import {Q} from '@nozbe/watermelondb';
import {
  Button,
  DateField,
  DerivedAmount,
  RecordList,
  FilterBanner,
  RecordCard,
  SearchField,
  Segmented,
  SelectField,
  TextField,
} from '../../components';
import {database} from '../../db';
import {VegetableSale, VegetableSaleItem} from '../../db/models';
import {confirmDelete} from '../records/confirmDelete';
import {loadCategories, loadVegetableActivity, loadVegetableSaleLines, loadVegetables} from '../../db/reads';
import {rateOn, addRate} from '../../db/rates';
import {updateVegetableSale} from '../../db/updates';
import {saveVegetableDay} from '../../db/writes';
import {useCopy, useTx} from '../../i18n/locale';
import {startOfDay} from '../../domain/dates';
import {inDateRange, includesText} from '../../domain/listFilter';
import {OWNERSHIP_LABEL} from '../../domain/labels';
import {LedgerError, netAmount, parseNumber, sumAmounts} from '../../domain/money';
import {amountFromQuantity, soldFromStock, vegetableDayTotals, type VegetableSaleInput} from '../../domain/sales';
import {positiveNumber, requiredName} from '../../forms/fields';
import {useAsyncData} from '../../hooks/useAsyncData';
import {useListFilter} from '../../hooks/useListFilter';
import {RootStackParamList, TabParamList} from '../../navigation/types';
import {colors, fonts, formatIndianDate, formatInr, spacing} from '../../theme';

const saleLine = z
  .object({
    vegetableId: z.string().min(1, 'भाजी निवडा'),
    unit: requiredName,
    rate: positiveNumber,
    entry: z.enum(['quantity', 'stock']),
    quantity: z.string(),
    opening: z.string(),
    remaining: z.string(),
  })
  .superRefine((line, ctx) => {
    if (line.entry === 'quantity') {
      const qty = parseNumber(line.quantity);
      if (qty == null || qty <= 0) {
        ctx.addIssue({code: 'custom', message: 'प्रमाण भरा', path: ['quantity']});
      }
      return;
    }
    if (soldFromStock(line.opening, line.remaining) == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'सुरुवात शिल्लकपेक्षा जास्त हवी',
        path: ['opening'],
      });
    }
  });

const expenseLine = z.object({
  categoryId: z.string().min(1, 'प्रकार निवडा'),
  amount: positiveNumber,
  notes: z.string(),
});

const schema = z
  .object({
    ownership: z.enum(['own', 'shared']),
    sales: z.array(saleLine),
    expenses: z.array(expenseLine),
  })
  .superRefine((value, ctx) => {
    if (value.sales.length === 0 && value.expenses.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'किमान एक विक्री किंवा खर्च भरा',
        path: ['sales'],
      });
    }
  });

type Values = z.infer<typeof schema>;

const emptySale = {
  vegetableId: '',
  unit: 'किलो',
  rate: '',
  entry: 'quantity' as const,
  quantity: '',
  opening: '',
  remaining: '',
};

function saleInput(line: Values['sales'][number]): VegetableSaleInput | null {
  const sold =
    line.entry === 'stock' ? soldFromStock(line.opening, line.remaining) : line.quantity.trim();
  if (sold == null) {
    return null;
  }
  const saleAmount = amountFromQuantity(sold, line.rate);
  const quantity = parseNumber(sold);
  const appliedRate = parseNumber(line.rate);
  if (saleAmount == null || quantity == null || appliedRate == null) {
    return null;
  }
  return {
    vegetableId: line.vegetableId,
    quantity,
    unit: line.unit,
    saleAmount,
    appliedRate,
    openingQuantity: line.entry === 'stock' ? parseNumber(line.opening) : null,
    remainingQuantity: line.entry === 'stock' ? parseNumber(line.remaining) : null,
  };
}

export function VegetableScreen() {
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<TabParamList, 'Bhaji'>,
        NativeStackNavigationProp<RootStackParamList>
      >
    >();
  const route = useRoute<RouteProp<TabParamList, 'Bhaji'>>();
  const filter = useListFilter(route.params?.filter);
  const copy = useCopy();
  const tx = useTx();
  const [date, setDate] = useState(() => new Date());
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const vegetables = useAsyncData(() => loadVegetables(database), []);
  const categories = useAsyncData(() => loadCategories(database), []);
  const history = useAsyncData(() => loadVegetableActivity(database), []);
  const savedLines = useAsyncData(() => loadVegetableSaleLines(database), []);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {ownership: 'own', sales: [emptySale], expenses: []},
    mode: 'onSubmit',
  });
  const sales = useFieldArray({control: form.control, name: 'sales'});
  const expenses = useFieldArray({control: form.control, name: 'expenses'});
  const saleValues = form.watch('sales');
  const expenseValues = form.watch('expenses');
  const preparedSales = saleValues
    .map(saleInput)
    .filter((line): line is VegetableSaleInput => line != null);
  const incomeExact = sumAmounts(preparedSales.map(line => line.saleAmount));
  const expenseExact = sumAmounts(
    expenseValues.map(line => parseNumber(line.amount) ?? 0).filter(value => value > 0),
  );
  const income = Number(incomeExact);
  const expenseTotal = Number(expenseExact);
  const net = Number(netAmount(incomeExact, expenseExact));
  const activeVegetables = vegetables.data.filter(item => item.active);
  const activeCategories = categories.data.filter(
    item => item.active && (item.businessType === 'vegetable' || item.categoryGroup === 'labour'),
  );
  const visibleHistory = useMemo(
    () =>
      history.data.filter(item => {
        if (!inDateRange(item.date, filter)) {
          return false;
        }
        if (!filter.text.trim()) {
          return true;
        }
        return (
          includesText(item.title, filter.text) ||
          includesText(item.subtitle, filter.text) ||
          formatIndianDate(new Date(item.date)).includes(filter.text.trim()) ||
          String(item.amount).includes(filter.text.trim())
        );
      }),
    [history.data, filter],
  );

  useEffect(() => {
    const id = route.params?.editSaleId;
    if (!id) {
      return;
    }
    startSaleEdit(id);
    navigation.setParams({editSaleId: undefined});
  }, [route.params?.editSaleId]);

  async function startSaleEdit(id: string) {
    const sale = await database.get<VegetableSale>('vegetable_sales').find(id);
    const items = await database
      .get<VegetableSaleItem>('vegetable_sale_items')
      .query(Q.where('sale_id', id), Q.where('is_deleted', false))
      .fetch();
    setEditingSaleId(id);
    setDate(sale.date);
    form.reset({
      ownership: sale.ownershipType === 'shared' ? 'shared' : 'own',
      sales: items.map(item => ({
        vegetableId: item.vegetableId,
        quantity: String(item.quantity),
        unit: item.unit,
        rate:
          item.appliedRate != null && item.appliedRate > 0
            ? String(item.appliedRate)
            : item.quantity > 0
              ? String(Number((item.saleAmount / item.quantity).toFixed(2)))
              : '',
        entry: item.openingQuantity != null ? ('stock' as const) : ('quantity' as const),
        opening: item.openingQuantity != null ? String(item.openingQuantity) : '',
        remaining: item.remainingQuantity != null ? String(item.remainingQuantity) : '',
      })),
      expenses: [],
    });
  }

  const vegetableKey = saleValues.map(line => line.vegetableId).join('|');
  useEffect(() => {
    let cancelled = false;
    saleValues.forEach((line, index) => {
      if (!line.vegetableId || line.rate.trim()) {
        return;
      }
      rateOn(database, 'vegetable', line.vegetableId, date).then(next => {
        if (!cancelled && next != null && !form.getValues(`sales.${index}.rate`)) {
          form.setValue(`sales.${index}.rate`, String(next));
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [date, form, vegetableKey, saleValues]);

  const dayTotals = useMemo(() => {
    const day = startOfDay(date).getTime();
    const saved = savedLines.data.filter(
      line => startOfDay(new Date(line.date)).getTime() === day && line.saleId !== editingSaleId,
    );
    return vegetableDayTotals([
      ...saved.map(line => ({
        name: line.name,
        unit: line.unit,
        quantity: String(line.quantity),
        amount: String(line.saleAmount),
      })),
      ...preparedSales.map(line => ({
        name: activeVegetables.find(item => item.id === line.vegetableId)?.name ?? 'भाजी',
        unit: line.unit,
        quantity: String(line.quantity),
        amount: String(line.saleAmount),
      })),
    ]);
  }, [activeVegetables, date, editingSaleId, preparedSales, savedLines.data]);

  async function rememberRates(lines: VegetableSaleInput[]) {
    await Promise.all(
      lines.map(async line => {
        const existing = await rateOn(database, 'vegetable', line.vegetableId, date);
        if (existing == null && line.appliedRate > 0) {
          await addRate(database, {
            masterType: 'vegetable',
            itemId: line.vegetableId,
            rate: line.appliedRate,
            effectiveFrom: date,
          });
        }
      }),
    );
  }

  async function submit(values: Values) {
    setFormError(null);
    const sales = values.sales.map(saleInput).filter((line): line is VegetableSaleInput => line != null);
    if (values.sales.length > 0 && sales.length !== values.sales.length) {
      setFormError('प्रमाण आणि विक्री दर भरा');
      return;
    }
    try {
      await rememberRates(sales);
      if (editingSaleId) {
        await updateVegetableSale(database, editingSaleId, {
          date,
          ownershipType: values.ownership,
          sales,
        });
        if (values.expenses.length > 0) {
          await saveVegetableDay(database, {
            date,
            ownershipType: values.ownership,
            sales: [],
            expenses: values.expenses.map(line => ({
              categoryId: line.categoryId,
              amount: parseNumber(line.amount) ?? 0,
              notes: line.notes,
            })),
          });
        }
        setEditingSaleId(null);
      } else {
        await saveVegetableDay(database, {
          date,
          ownershipType: values.ownership,
          sales,
          expenses: values.expenses.map(line => ({
            categoryId: line.categoryId,
            amount: parseNumber(line.amount) ?? 0,
            notes: line.notes,
          })),
        });
      }
      form.reset({ownership: 'own', sales: [emptySale], expenses: []});
      setDate(new Date());
      await history.reload();
      await savedLines.reload();
    } catch (error) {
      setFormError(error instanceof LedgerError ? error.message : 'जतन करता आले नाही');
    }
  }

  return (
    <RecordList
      data={visibleHistory}
      keyExtractor={item => item.id}
      empty={
        filter.text || filter.from != null || filter.to != null
          ? 'या शोधात काही सापडले नाही.'
          : 'अजून भाजी नोंद नाही.'
      }
      renderItem={({item}) => (
        <RecordCard
          title={`${formatIndianDate(new Date(item.date))} · ${item.title}`}
          subtitle={item.subtitle}
          amount={item.amount}
          tone={item.tone}
          onEdit={() => {
            if (item.sourceTable === 'vegetable_sales') {
              startSaleEdit(item.sourceId);
              return;
            }
            navigation.navigate('ExpenseEntry', {expenseId: item.sourceId});
          }}
          onDelete={() => confirmDelete(item.sourceTable, item.sourceId, history.reload)}
        />
      )}
      header={
        <>
      <View style={styles.actions}>
        <Button
          label="भाजी यादी"
          variant="secondary"
          onPress={() => navigation.navigate('VegetableMaster')}
          style={styles.action}
        />
        <Button
          label="मजुरी"
          variant="secondary"
          onPress={() => navigation.navigate('LabourMaster')}
          style={styles.action}
        />
      </View>
      <DateField value={date} onChange={setDate} />
      <Text style={styles.day}>{copy.weekdays[date.getDay()]}</Text>
      <Controller
        control={form.control}
        name="ownership"
        render={({field}) => (
          <Segmented
            label="उत्पन्न"
            value={field.value}
            onChange={field.onChange}
            options={[
              {value: 'own', label: OWNERSHIP_LABEL.own},
              {value: 'shared', label: OWNERSHIP_LABEL.shared},
            ]}
          />
        )}
      />
      <Text style={styles.section}>{tx('विक्री')}</Text>
      {sales.fields.map((row, index) => (
        <View key={row.id} style={styles.line}>
          <Controller
            control={form.control}
            name={`sales.${index}.vegetableId`}
            render={({field, fieldState}) => (
              <SelectField
                label="भाजी"
                value={field.value}
                options={activeVegetables.map(item => ({
                  value: item.id,
                  label: item.name,
                  hint: item.unit,
                }))}
                onChange={value => {
                  field.onChange(value);
                  const match = activeVegetables.find(item => item.id === value);
                  if (match) {
                    form.setValue(`sales.${index}.unit`, match.unit);
                  }
                  form.setValue(`sales.${index}.rate`, '');
                }}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name={`sales.${index}.rate`}
            render={({field, fieldState}) => (
              <TextField
                label="विक्री दर (₹)"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            )}
          />
          <Controller
            control={form.control}
            name={`sales.${index}.entry`}
            render={({field}) => (
              <Segmented
                label="प्रमाण कसे?"
                value={field.value}
                onChange={field.onChange}
                options={[
                  {value: 'quantity', label: 'विकलेले प्रमाण'},
                  {value: 'stock', label: 'सुरुवात − शिल्लक'},
                ]}
              />
            )}
          />
          {saleValues[index]?.entry === 'stock' ? (
            <>
              <Controller
                control={form.control}
                name={`sales.${index}.opening`}
                render={({field, fieldState}) => (
                  <TextField
                    label="सुरुवातीचे प्रमाण"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error?.message}
                    keyboardType="decimal-pad"
                  />
                )}
              />
              <Controller
                control={form.control}
                name={`sales.${index}.remaining`}
                render={({field, fieldState}) => (
                  <TextField
                    label="शिल्लक प्रमाण"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error?.message}
                    keyboardType="decimal-pad"
                  />
                )}
              />
            </>
          ) : (
            <Controller
              control={form.control}
              name={`sales.${index}.quantity`}
              render={({field, fieldState}) => (
                <TextField
                  label={`प्रमाण (${saleValues[index]?.unit || 'किलो'})`}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  keyboardType="decimal-pad"
                />
              )}
            />
          )}
          <DerivedAmount
            label="या भाजीची रक्कम"
            amount={saleInput(saleValues[index] ?? emptySale)?.saleAmount ?? null}
            hint="प्रमाण × विक्री दर. ही रक्कम आपोआप आहे."
          />
          {sales.fields.length > 1 ? (
            <Pressable onPress={() => sales.remove(index)}>
              <Text style={styles.remove}>{tx('ओळ काढा')}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Button
        label="आणखी भाजी"
        variant="secondary"
        onPress={() => sales.append(emptySale)}
      />
      <DerivedAmount label="आजची विक्री" amount={income} tone="in" />
      {dayTotals.length > 0 ? (
        <View style={styles.line}>
          <Text style={styles.section}>{tx('आज भाजीनिहाय')}</Text>
          {dayTotals.map(row => (
            <Text key={`${row.name}-${row.unit}`} style={styles.totalLine}>
              {tx(row.name)} · {row.quantity} {tx(row.unit)} · {formatInr(Number(row.amount))}
            </Text>
          ))}
        </View>
      ) : null}
      <Text style={styles.section}>{tx('खर्च')}</Text>
      {expenses.fields.map((row, index) => (
        <View key={row.id} style={styles.line}>
          <Controller
            control={form.control}
            name={`expenses.${index}.categoryId`}
            render={({field, fieldState}) => (
              <SelectField
                label="प्रकार"
                value={field.value}
                options={activeCategories.map(item => ({value: item.id, label: item.name}))}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name={`expenses.${index}.amount`}
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
            name={`expenses.${index}.notes`}
            render={({field}) => (
              <TextField label="टीप" value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Pressable onPress={() => expenses.remove(index)}>
            <Text style={styles.remove}>{tx('खर्च काढा')}</Text>
          </Pressable>
        </View>
      ))}
      <Button
        label="खर्च जोडा"
        variant="secondary"
        onPress={() => expenses.append({categoryId: '', amount: '', notes: ''})}
      />
      <DerivedAmount label="आजचा खर्च" amount={expenseTotal} tone="out" />
      <DerivedAmount
        label="आजचा निव्वळ (विक्री − खर्च)"
        amount={net}
        tone={net >= 0 ? 'in' : 'out'}
        hint="ही रक्कम आपोआप आहे. जतन करण्यापूर्वी तपासा."
      />
      {editingSaleId ? (
        <Text style={styles.error}>{tx('ही विक्री सुधारत आहात. जतन केल्यावर जुनी ओळ बदलते.')}</Text>
      ) : null}
      {formError ? <Text style={styles.error}>{tx(formError)}</Text> : null}
      {form.formState.errors.sales?.message ? (
        <Text style={styles.error}>{tx(form.formState.errors.sales.message)}</Text>
      ) : null}
      <Button
        label={editingSaleId ? 'विक्री सुधार जतन करा' : 'दिवस जतन करा'}
        onPress={form.handleSubmit(submit)}
      />
      {editingSaleId ? (
        <Button
          label="रद्द"
          variant="secondary"
          onPress={() => {
            setEditingSaleId(null);
            form.reset({ownership: 'own', sales: [emptySale], expenses: []});
          }}
        />
      ) : null}
      <Text style={styles.section}>{tx('आधीच्या नोंदी')}</Text>
      <SearchField
        value={filter.text}
        onChangeText={filter.setText}
        placeholder="भाजी, खर्च, तारीख किंवा रक्कम"
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
  day: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textMuted,
  },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.text,
    marginTop: spacing.sm,
  },
  line: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  totalLine: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  remove: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.danger,
    minHeight: 44,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.danger,
  },
});
