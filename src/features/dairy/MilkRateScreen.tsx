import {RouteProp, useRoute} from '@react-navigation/native';
import React, {useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button, DateField, DerivedAmount, FormScreen, SuggestField, TextField} from '../../components';
import {database} from '../../db';
import {addRate, ratesFor} from '../../db/rates';
import {loadSupplierNames} from '../../db/reads';
import {MILK_RATE_ITEM_ID} from '../../domain/labels';
import {LedgerError, parseNumber} from '../../domain/money';
import {useAsyncData} from '../../hooks/useAsyncData';
import {useTx} from '../../i18n/locale';
import {RootStackParamList} from '../../navigation/types';
import {colors, fonts, formatIndianDate, formatInr, spacing} from '../../theme';

export function MilkRateScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'MilkRates'>>();
  const tx = useTx();
  const [supplier, setSupplier] = useState(route.params?.supplier ?? '');
  const [date, setDate] = useState(() => new Date());
  const [rateText, setRateText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const history = useAsyncData(() => ratesFor(database, 'milk'), []);
  const known = useAsyncData(() => loadSupplierNames(database), []);
  const parsedRate = parseNumber(rateText);
  const name = supplier.trim();
  const suggestions = useMemo(() => {
    const fromRates = history.data
      .map(row => row.itemId)
      .filter(itemId => itemId && itemId !== MILK_RATE_ITEM_ID);
    return [...new Set([...known.data, ...fromRates])].sort((left, right) =>
      left.localeCompare(right, 'mr'),
    );
  }, [history.data, known.data]);
  const rows = history.data.filter(row => (name ? row.itemId === name : true));

  async function submit() {
    setMessage(null);
    if (!name) {
      setMessage('पुरवठादाराचे नाव भरा');
      return;
    }
    const rate = parseNumber(rateText);
    if (rate == null || !(rate > 0)) {
      setMessage('दर शून्यापेक्षा जास्त हवा');
      return;
    }
    try {
      await addRate(database, {
        masterType: 'milk',
        itemId: name,
        rate,
        effectiveFrom: date,
      });
      setRateText('');
      setMessage('दर जतन झाला. आधीचे व्यवहार बदलले नाहीत.');
      await history.reload();
      await known.reload();
    } catch (error) {
      setMessage(error instanceof LedgerError ? error.message : 'दर जतन करता आला नाही');
    }
  }

  return (
    <FormScreen>
      <Text style={styles.help}>
        {tx(
          'प्रत्येक पुरवठादाराचा दर वेगळा असतो. हा दर त्या तारखेपासून त्याच्या नवीन नोंदींना लागू होतो. जुन्या नोंदींवरचा दर तसाच राहतो.',
        )}
      </Text>
      <SuggestField
        label="पुरवठादार"
        value={supplier}
        onChangeText={setSupplier}
        suggestions={suggestions}
        placeholder="नाव लिहा"
      />
      <DateField label="या तारखेपासून" value={date} onChange={setDate} />
      <TextField
        label="दर (₹)"
        value={rateText}
        onChangeText={setRateText}
        keyboardType="decimal-pad"
        placeholder="0"
      />
      <DerivedAmount
        label="जतन होणारा दर"
        amount={parsedRate != null && parsedRate > 0 ? parsedRate : null}
        hint={`${formatIndianDate(date)} ${tx('पासून. जुने व्यवहार बदलणार नाहीत.')}`}
      />
      {message ? <Text style={styles.message}>{tx(message)}</Text> : null}
      <Button label="दर जतन करा" onPress={submit} />
      <Text style={styles.section}>{tx('आधीचे दर')}</Text>
      <View style={styles.list}>
        {rows.length === 0 ? <Text style={styles.help}>{tx('अजून दर नाही.')}</Text> : null}
        {rows.map(row => (
          <View key={row.id} style={styles.row}>
            <Text style={styles.rowTitle}>
              {row.itemId === MILK_RATE_ITEM_ID ? tx('जुना सामाईक दर') : row.itemId}
            </Text>
            <Text style={styles.help}>
              {formatInr(row.rate)} · {formatIndianDate(row.effectiveFrom)}
              {row.effectiveTo ? ` ${tx('ते')} ${formatIndianDate(row.effectiveTo)}` : ` ${tx('पासून')}`}
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
    lineHeight: 22,
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
