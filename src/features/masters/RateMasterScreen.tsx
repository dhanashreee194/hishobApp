import {zodResolver} from '@hookform/resolvers/zod';
import React, {useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {StyleSheet, Text, View} from 'react-native';
import {z} from 'zod';
import {
  Button,
  DateField,
  DerivedAmount,
  FormScreen,
  SelectField,
  TextField,
} from '../../components';
import {database} from '../../db';
import {addRate, ratesFor} from '../../db/rates';
import {LedgerError} from '../../domain/money';
import {positiveNumber} from '../../forms/fields';
import {useAsyncData} from '../../hooks/useAsyncData';
import {colors, fonts, formatIndianDate, formatInr, spacing} from '../../theme';
import {parseNumber} from '../../domain/money';

const schema = z.object({
  itemId: z.string().min(1, 'आयटम निवडा'),
  rate: positiveNumber,
});

type Values = z.infer<typeof schema>;

type Item = {id: string; name: string};

type Props = {
  masterType: 'grain' | 'milk';
  items: Item[];
};

export function RateMasterScreen({masterType, items}: Props) {
  const [date, setDate] = useState(() => new Date());
  const [message, setMessage] = useState<string | null>(null);
  const history = useAsyncData(
    () => ratesFor(database, masterType),
    [],
  );
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {itemId: items[0]?.id ?? '', rate: ''},
    mode: 'onChange',
  });
  const itemId = form.watch('itemId') || items[0]?.id || '';
  const rateText = form.watch('rate');

  useEffect(() => {
    if (!form.getValues('itemId') && items[0]) {
      form.setValue('itemId', items[0].id);
    }
  }, [form, items]);
  const parsedRate = parseNumber(rateText);
  const rows = history.data.filter(row => row.itemId === itemId);

  async function submit(values: Values) {
    try {
      const rate = parseNumber(values.rate);
      if (rate == null) {
        return;
      }
      await addRate(database, {
        masterType,
        itemId: values.itemId,
        rate,
        effectiveFrom: date,
      });
      form.setValue('rate', '');
      setMessage('दर जतन झाला. आधीचे व्यवहार बदलले नाहीत.');
      await history.reload();
    } catch (error) {
      setMessage(error instanceof LedgerError ? error.message : 'दर जतन करता आला नाही');
    }
  }

  return (
    <FormScreen>
      <Text style={styles.help}>
        दर या तारखेपासून नवीन नोंदींना लागू होईल. जुन्या नोंदींवरचा दर तसाच राहतो.
      </Text>
      <Controller
        control={form.control}
        name="itemId"
        render={({field, fieldState}) => (
          <SelectField
            label={masterType === 'milk' ? 'दूध' : 'धान्य'}
            value={field.value || itemId}
            options={items.map(item => ({value: item.id, label: item.name}))}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <DateField label="या तारखेपासून" value={date} onChange={setDate} />
      <Controller
        control={form.control}
        name="rate"
        render={({field, fieldState}) => (
          <TextField
            label="दर (₹)"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        )}
      />
      <DerivedAmount
        label="जतन होणारा दर"
        amount={parsedRate != null && parsedRate > 0 ? parsedRate : null}
        hint={`${formatIndianDate(date)} पासून. जुने व्यवहार बदलणार नाहीत.`}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button label="दर जतन करा" onPress={form.handleSubmit(submit)} />
      <Text style={styles.section}>आधीचे दर</Text>
      <View style={styles.list}>
        {rows.length === 0 ? <Text style={styles.help}>अजून दर नाही.</Text> : null}
        {rows.map(row => (
          <View key={row.id} style={styles.row}>
            <Text style={styles.rowTitle}>{formatInr(row.rate)}</Text>
            <Text style={styles.help}>
              {formatIndianDate(row.effectiveFrom)}
              {row.effectiveTo ? ` ते ${formatIndianDate(row.effectiveTo)}` : ' पासून'}
            </Text>
          </View>
        ))}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  help: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  message: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.primary,
  },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
    marginTop: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  rowTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
  },
});
