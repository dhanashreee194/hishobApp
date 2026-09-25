import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {CompositeNavigationProp, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  Button,
  DateField,
  OptionalDateField,
  SearchField,
  Segmented,
  SelectField,
  TrendChart,
} from '../../components';
import {database} from '../../db';
import {loadReportSource, loadSearchIndex, type ReportSource} from '../../db/reportData';
import {startOfDay} from '../../domain/dates';
import {PARTNER_BUSINESS_LABEL} from '../../domain/labels';
import {compareMoney, sumAmounts} from '../../domain/money';
import {
  buildDairyReport,
  buildFlourReport,
  buildPartnerReport,
  buildUdhariReport,
  buildVegetableReport,
  reportHasMovement,
  scopePartnerBooks,
  type BuiltReport,
  type PeriodKind,
} from '../../domain/reports';
import {searchLedger, type SearchHit, type SearchIndex} from '../../domain/search';
import {useAsyncData} from '../../hooks/useAsyncData';
import {RootStackParamList, TabParamList} from '../../navigation/types';
import {colors, fonts, formatExactRupees, spacing} from '../../theme';
import {chartSeries} from './chartSeries';
import {exportReportCsv, exportReportPdf} from './exportReport';
import {useSyncStatus} from '../../sync/status';
import {headerIn, useCopy, useLocale} from '../../i18n/locale';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type ModuleId = 'flour' | 'dairy' | 'vegetable' | 'udhari' | 'partner';

const EMPTY_SOURCE: ReportSource = {
  flour: [],
  milk: [],
  vegetableSales: [],
  vegetableExpenses: [],
  sharedSales: [],
  sharedExpenses: [],
  ledger: [],
  partners: [],
  payments: [],
};

const EMPTY_INDEX: SearchIndex = {customers: [], flour: [], milk: [], vegetables: []};

export function ReportsScreen() {
  const navigation = useNavigation<Nav>();
  const copy = useCopy();
  const locale = useLocale(state => state.locale);
  const modules: Array<{value: ModuleId; label: string}> = [
    {value: 'flour', label: copy.mill},
    {value: 'dairy', label: copy.dairyShort},
    {value: 'vegetable', label: copy.vegetables},
    {value: 'udhari', label: copy.credit},
    {value: 'partner', label: copy.partnership},
  ];
  const periods: Array<{value: PeriodKind; label: string}> = [
    {value: 'day', label: copy.daily},
    {value: 'month', label: copy.monthly},
    {value: 'year', label: copy.yearly},
    {value: 'progressive', label: copy.progressive},
  ];
  const [module, setModule] = useState<ModuleId>('flour');
  const [period, setPeriod] = useState<PeriodKind>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [partnerId, setPartnerId] = useState('');
  const [text, setText] = useState('');
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const assistant = useSyncStatus(state => state.role === 'assistant');
  const source = useAsyncData(() => loadReportSource(database), EMPTY_SOURCE);
  const index = useAsyncData(() => loadSearchIndex(database), EMPTY_INDEX);
  const partner = source.data.partners.find(row => row.id === partnerId) ?? null;

  useEffect(() => {
    if (partnerId || source.data.partners.length === 0) {
      return;
    }
    const next = source.data.partners.find(row => row.active) ?? source.data.partners[0];
    setPartnerId(next.id);
  }, [partnerId, source.data.partners]);

  const shareTotal = sumAmounts(
    source.data.partners.filter(row => row.active).map(row => row.sharePercent),
  );
  const report = useMemo(
    () =>
      buildModuleReport(
        source.data,
        module,
        period,
        anchor,
        partnerId,
        partner?.businessType ?? 'vegetable',
        partner?.sharePercent ?? '0',
      ),
    [source.data, module, period, anchor, partnerId, partner?.sharePercent, partner?.businessType],
  );
  const hits = useMemo(
    () =>
      searchLedger(index.data, {
        text,
        from: from ? startOfDay(from).getTime() : null,
        to: to ? startOfDay(to).getTime() : null,
      }),
    [index.data, text, from, to],
  );
  const visibleRows = reportHasMovement(report) ? report.rows : [];
  const series = chartSeries(report.headers, visibleRows).map(item => ({
    ...item,
    name: headerIn(locale, item.name),
  }));

  async function exportReport(kind: 'csv' | 'pdf') {
    setExporting(kind);
    setExportMessage(null);
    try {
      const exported = {...report, rows: visibleRows};
      if (kind === 'csv') {
        await exportReportCsv(exported);
      } else {
        await exportReportPdf(exported);
      }
      setExportMessage('डाउनलोड फोल्डरमध्ये जतन झाले.');
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : 'फाइल जतन झाली नाही.');
    } finally {
      setExporting(null);
    }
  }

  function openHit(hit: SearchHit) {
    if (hit.module === 'dairy') {
      navigation.navigate('Dairy', {filter: hit.filter});
      return;
    }
    const screen = hit.module === 'flour' ? 'Girni' : hit.module === 'vegetable' ? 'Bhaji' : 'Udhari';
    navigation.navigate(screen, {filter: hit.filter});
  }

  function shift(direction: -1 | 1) {
    setAnchor(current => {
      if (period === 'day') {
        return new Date(current.getFullYear(), current.getMonth() + direction, 1);
      }
      if (period === 'progressive') {
        const next = new Date(current);
        next.setDate(next.getDate() + direction);
        return next;
      }
      return new Date(current.getFullYear() + direction, current.getMonth(), 1);
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{copy.search}</Text>
      <SearchField
        value={text}
        onChangeText={setText}
        placeholder="ग्राहक, धान्य किंवा भाजी"
      />
      <View style={styles.dates}>
        <OptionalDateField label="पासून" value={from} onChange={setFrom} />
        <OptionalDateField label="पर्यंत" value={to} onChange={setTo} />
      </View>
      {hits.map(hit => (
        <Pressable key={hit.module} onPress={() => openHit(hit)} style={styles.hit}>
          <Text style={styles.hitTitle}>{hit.title}</Text>
          <Text style={styles.hitDetail}>{hit.detail}</Text>
        </Pressable>
      ))}
      {assistant ? null : (
      <View style={styles.actions}>
        <Button
          label="भागीदार"
          variant="secondary"
          onPress={() => navigation.navigate('PartnerMaster')}
          style={styles.action}
        />
        <Button
          label="हिशोब"
          variant="secondary"
          onPress={() => navigation.navigate('PartnerSettlement', {partnerId: partnerId || undefined})}
          style={styles.action}
        />
      </View>
      )}
      <Text style={styles.heading}>{copy.reports}</Text>
      <View style={styles.modules}>
        {modules.map(item => {
          const selected = item.value === module;
          return (
            <Pressable
              key={item.value}
              onPress={() => setModule(item.value)}
              style={[styles.module, selected ? styles.moduleOn : null]}>
              <Text style={[styles.moduleLabel, selected ? styles.moduleLabelOn : null]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Segmented label={copy.period} value={period} onChange={setPeriod} options={periods} />
      <DateField label={copy.aroundDate} value={anchor} onChange={setAnchor} />
      <View style={styles.shift}>
        <Button label={copy.previous} variant="secondary" onPress={() => shift(-1)} style={styles.action} />
        <Button label={copy.next} variant="secondary" onPress={() => shift(1)} style={styles.action} />
      </View>
      <Text style={styles.period}>{report.periodLabel}</Text>
      {module === 'partner' ? (
        source.data.partners.length === 0 ? (
          <Text style={styles.empty}>आधी भागीदार जोडा. वाटा टक्केवारी मास्टरमध्ये ठेवा.</Text>
        ) : (
          <SelectField
            label="भागीदार"
            value={partnerId}
            options={source.data.partners.map(row => ({
              value: row.id,
              label: row.name,
              hint: row.active
                ? `${PARTNER_BUSINESS_LABEL[row.businessType] ?? 'भाजी'} · ${row.sharePercent}%`
                : 'बंद',
            }))}
            onChange={setPartnerId}
          />
        )
      ) : null}
      {module === 'partner' && compareMoney(shareTotal, 100) > 0 ? (
        <Text style={styles.warn}>सक्रिय भागीदारांचा एकूण वाटा {shareTotal}% आहे. १००% पेक्षा जास्त.</Text>
      ) : null}
      {visibleRows.length === 0 ? (
        <Text style={styles.empty}>{copy.noRows}</Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TrendChart series={series} />
          </ScrollView>
          {report.headers.includes('लिटर') ? (
            <Text style={styles.period}>आलेख रकमेचा आहे. लिटर तक्त्यात आहेत.</Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.row}>
                <Text style={[styles.cell, styles.head, styles.labelCell]}>काळ</Text>
                {report.headers.map(header => (
                  <Text key={header} style={[styles.cell, styles.head]}>
                    {headerIn(locale, header)}
                  </Text>
                ))}
              </View>
              {visibleRows.map(row => (
                <View key={row.key} style={styles.row}>
                  <Text style={[styles.cell, styles.labelCell]}>{row.label}</Text>
                  {row.cells.map((cell, index) => (
                    <Text key={`${row.key}-${report.headers[index]}`} style={styles.cell}>
                      {report.headers[index] === 'लिटर' ? cell : formatExactRupees(cell)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}
      <View style={styles.shift}>
        <Button
          label={exporting === 'csv' ? copy.saving : copy.excel}
          variant="secondary"
          onPress={() => exportReport('csv')}
          disabled={exporting != null}
          style={styles.action}
        />
        <Button
          label={exporting === 'pdf' ? copy.saving : copy.pdf}
          variant="secondary"
          onPress={() => exportReport('pdf')}
          disabled={exporting != null}
          style={styles.action}
        />
      </View>
      {exportMessage ? <Text style={styles.period}>{exportMessage}</Text> : null}
    </ScrollView>
  );
}

function buildModuleReport(
  source: ReportSource,
  module: ModuleId,
  period: PeriodKind,
  anchor: Date,
  partnerId: string,
  businessType: string,
  sharePercent: string,
): BuiltReport {
  if (module === 'flour') {
    return buildFlourReport(source.flour, period, anchor);
  }
  if (module === 'dairy') {
    return buildDairyReport(source.milk, period, anchor);
  }
  if (module === 'vegetable') {
    return buildVegetableReport(source.vegetableSales, source.vegetableExpenses, period, anchor);
  }
  if (module === 'udhari') {
    return buildUdhariReport(source.ledger, period, anchor);
  }
  return buildPartnerReport(
    {
      ...scopePartnerBooks(businessType, source.sharedSales, source.sharedExpenses),
      payments: source.payments
        .filter(row => row.partnerId === partnerId)
        .map(row => ({date: row.date, amount: row.amount})),
      sharePercent,
    },
    period,
    anchor,
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl},
  heading: {fontFamily: fonts.semibold, fontSize: 22, color: colors.text},
  dates: {flexDirection: 'row', gap: spacing.sm},
  hit: {
    minHeight: spacing.touch,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hitTitle: {fontFamily: fonts.semibold, fontSize: 18, color: colors.text},
  hitDetail: {fontFamily: fonts.medium, fontSize: 16, color: colors.primary},
  actions: {flexDirection: 'row', gap: spacing.sm},
  action: {flex: 1},
  modules: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  module: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  moduleLabel: {fontFamily: fonts.medium, fontSize: 15, color: colors.text},
  moduleLabelOn: {color: '#FFFFFF'},
  shift: {flexDirection: 'row', gap: spacing.sm},
  period: {fontFamily: fonts.medium, fontSize: 16, color: colors.textMuted},
  empty: {fontFamily: fonts.regular, fontSize: 16, color: colors.textMuted},
  warn: {fontFamily: fonts.medium, fontSize: 15, color: colors.danger},
  row: {flexDirection: 'row'},
  cell: {
    width: 200,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  labelCell: {width: 140},
  head: {fontFamily: fonts.semibold, color: colors.textMuted},
});
