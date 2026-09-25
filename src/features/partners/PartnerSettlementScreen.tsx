import {zodResolver} from '@hookform/resolvers/zod';
import {RouteProp, useRoute} from '@react-navigation/native';
import React, {useEffect, useMemo, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {StyleSheet, Text} from 'react-native';
import {z} from 'zod';
import {
  Button,
  DateField,
  DerivedAmount,
  FormScreen,
  RecordCard,
  Segmented,
  SelectField,
  TextField,
} from '../../components';
import {database} from '../../db';
import {confirmDelete} from '../records/confirmDelete';
import {loadReportSource, type ReportSource} from '../../db/reportData';
import {recordPartnerPayment} from '../../db/writes';
import {updatePartnerPayment} from '../../db/updates';
import {weekdayName} from '../../domain/dates';
import {PARTNER_BUSINESS_LABEL} from '../../domain/labels';
import {compareMoney, LedgerError, moneyNumber, netAmount, parseNumber, sumAmounts} from '../../domain/money';
import {settlementWindow, scopePartnerBooks, type PeriodKind} from '../../domain/reports';
import {settlePartner} from '../../domain/settlement';
import {positiveNumber} from '../../forms/fields';
import {useAsyncData} from '../../hooks/useAsyncData';
import {RootStackParamList} from '../../navigation/types';
import {colors, fonts, formatExactRupees, formatIndianDate} from '../../theme';

const schema = z.object({
  amount: positiveNumber,
  notes: z.string(),
});

type Values = z.infer<typeof schema>;

const PERIODS: Array<{value: PeriodKind; label: string}> = [
  {value: 'day', label: 'दैनिक'},
  {value: 'month', label: 'मासिक'},
  {value: 'year', label: 'वार्षिक'},
  {value: 'progressive', label: 'प्रगती'},
];

export function PartnerSettlementScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'PartnerSettlement'>>();
  const [partnerId, setPartnerId] = useState(route.params?.partnerId ?? '');
  const [period, setPeriod] = useState<PeriodKind>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [payDate, setPayDate] = useState(() => new Date());
  const [formError, setFormError] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const source = useAsyncData(() => loadReportSource(database), EMPTY_SOURCE);
  const partners = source.data.partners;
  const figures = useMemo(() => {
    const partner = partners.find(row => row.id === partnerId);
    if (!partner) {
      return null;
    }
    const window = settlementWindow(period, anchor);
    const inWindow = (date: number) => date >= window.from && date <= window.to;
    const payments = source.data.payments.filter(
      row => row.partnerId === partnerId && inWindow(row.date),
    );
    const books = scopePartnerBooks(
      partner.businessType,
      source.data.sharedSales,
      source.data.sharedExpenses,
    );
    return {
      ...settlePartner({
        sharedSales: sumAmounts(books.sales.filter(row => inWindow(row.date)).map(row => row.amount)),
        sharedExpenses: sumAmounts(
          books.expenses.filter(row => inWindow(row.date)).map(row => row.amount),
        ),
        sharePercent: partner.sharePercent,
        partnerPayments: sumAmounts(payments.map(row => row.amount)),
      }),
      payments,
      sharePercent: partner.sharePercent,
    };
  }, [source.data, partners, partnerId, period, anchor]);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {amount: '', notes: ''},
    mode: 'onChange',
  });
  const typed = parseNumber(form.watch('amount'));
  const editingPayment = figures?.payments.find(payment => payment.id === editingPaymentId) ?? null;
  const payableRoom =
    figures == null
      ? null
      : editingPayment
        ? sumAmounts([figures.remainingPayable, editingPayment.amount])
        : figures.remainingPayable;
  const remainingAfter =
    payableRoom != null && typed != null && typed > 0 ? netAmount(payableRoom, typed) : null;

  useEffect(() => {
    if (partnerId || partners.length === 0) {
      return;
    }
    setPartnerId((partners.find(row => row.active) ?? partners[0]).id);
  }, [partnerId, partners]);

  async function submit(values: Values) {
    setFormError(null);
    if (!partnerId || !figures) {
      setFormError('भागीदार निवडा');
      return;
    }
    try {
      if (editingPaymentId) {
        await updatePartnerPayment(database, editingPaymentId, {
          date: payDate,
          amount: Number(values.amount),
          notes: values.notes,
          period,
          anchor,
        });
        setEditingPaymentId(null);
      } else {
        await recordPartnerPayment(database, {
          partnerId,
          date: payDate,
          amount: Number(values.amount),
          notes: values.notes,
          period,
          anchor,
        });
      }
      form.reset({amount: '', notes: ''});
      await source.reload();
    } catch (error) {
      setFormError(error instanceof LedgerError ? error.message : 'जतन करता आले नाही');
    }
  }

  const canPay =
    figures != null &&
    (editingPaymentId != null || compareMoney(figures.remainingPayable, 0) > 0);

  return (
    <FormScreen>
      <Text style={styles.help}>
        सामाईक निव्वळ = सामाईक विक्री − सामाईक खर्च. वाटा फक्त{' '}
        {PARTNER_BUSINESS_LABEL[partners.find(row => row.id === partnerId)?.businessType ?? 'vegetable'] ?? 'भाजी'}{' '}
        धंद्यात मोजला जातो.
      </Text>
      <SelectField
        label="भागीदार"
        value={partnerId}
        options={partners.map(row => ({
          value: row.id,
          label: row.name,
          hint: `${PARTNER_BUSINESS_LABEL[row.businessType] ?? 'भाजी'} · ${row.sharePercent}%`,
        }))}
        onChange={setPartnerId}
      />
      <Segmented label="काळ" value={period} onChange={setPeriod} options={PERIODS} />
      <DateField value={anchor} onChange={setAnchor} />
      <Text style={styles.day}>{weekdayName(anchor)}</Text>
      {figures ? (
        <>
          <DerivedAmount label="सामाईक विक्री" amount={moneyNumber(figures.sharedSales)} tone="in" />
          <DerivedAmount label="सामाईक खर्च" amount={moneyNumber(figures.sharedExpenses)} tone="out" />
          <DerivedAmount
            label="सामाईक निव्वळ"
            amount={moneyNumber(figures.sharedNet)}
            hint="विक्री वजा खर्च"
          />
          <DerivedAmount
            label="भागीदाराचा वाटा"
            amount={moneyNumber(figures.partnerShare)}
            hint={`${figures.sharePercent}% × सामाईक निव्वळ = ${formatExactRupees(figures.partnerShare)}`}
          />
          <DerivedAmount
            label="मालकाचा वाटा"
            amount={moneyNumber(figures.ownerShare)}
            hint={`निव्वळ वजा भागीदाराचा वाटा = ${formatExactRupees(figures.ownerShare)}`}
          />
          <DerivedAmount
            label="नोंदलेली पेमेंट्स"
            amount={moneyNumber(figures.partnerPayments)}
            tone="out"
          />
          <DerivedAmount
            label="देय बाकी"
            amount={moneyNumber(figures.remainingPayable)}
            tone={compareMoney(figures.remainingPayable, 0) > 0 ? 'out' : 'in'}
            hint={`भागीदाराचा वाटा वजा पेमेंट = ${formatExactRupees(figures.remainingPayable)}`}
          />
        </>
      ) : (
        <Text style={styles.help}>भागीदार निवडल्यावर हिशोब दिसेल.</Text>
      )}
      {canPay ? (
        <>
          <Text style={styles.section}>
            {editingPaymentId ? 'पेमेंट सुधारा' : 'पेमेंट नोंदवा'}
          </Text>
          <DateField label="पेमेंट तारीख" value={payDate} onChange={setPayDate} />
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
          <DerivedAmount
            label="पेमेंट नंतरची बाकी"
            amount={remainingAfter == null ? null : moneyNumber(remainingAfter)}
            hint="ही रक्कम आपोआप आहे."
          />
          <Controller
            control={form.control}
            name="notes"
            render={({field}) => (
              <TextField label="टीप" value={field.value} onChangeText={field.onChange} />
            )}
          />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Button
            label={editingPaymentId ? 'सुधार जतन करा' : 'पेमेंट जतन करा'}
            onPress={form.handleSubmit(submit)}
          />
        </>
      ) : null}
      <Text style={styles.section}>या काळातील पेमेंट्स</Text>
      {(figures?.payments ?? []).length === 0 ? (
        <Text style={styles.help}>अजून पेमेंट नाही.</Text>
      ) : null}
      {(figures?.payments ?? []).map(payment => (
        <RecordCard
          key={payment.id}
          title={formatIndianDate(new Date(payment.date))}
          subtitle={payment.notes || 'भागीदार पेमेंट'}
          amount={moneyNumber(payment.amount)}
          tone="out"
          onEdit={() => {
            setEditingPaymentId(payment.id);
            setPayDate(new Date(payment.date));
            form.reset({amount: String(moneyNumber(payment.amount)), notes: payment.notes ?? ''});
          }}
          onDelete={() => confirmDelete('partner_payments', payment.id, source.reload)}
        />
      ))}
    </FormScreen>
  );
}

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

const styles = StyleSheet.create({
  help: {fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted},
  day: {fontFamily: fonts.medium, fontSize: 16, color: colors.textMuted},
  section: {fontFamily: fonts.semibold, fontSize: 20, color: colors.text},
  error: {fontFamily: fonts.regular, fontSize: 15, color: colors.danger},
});
