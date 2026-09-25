import {zodResolver} from '@hookform/resolvers/zod';
import React, {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {z} from 'zod';
import {Button, FormScreen, SelectField, TextField} from '../../components';
import {database} from '../../db';
import {loadReportSource} from '../../db/reportData';
import {savePartner, setPartnerActive} from '../../db/writes';
import {compareMoney, LedgerError, money, sumAmounts} from '../../domain/money';
import {PARTNER_BUSINESS_LABEL} from '../../domain/labels';
import {requiredName} from '../../forms/fields';
import {useAsyncData} from '../../hooks/useAsyncData';
import {colors, fonts, spacing} from '../../theme';

const schema = z.object({
  name: requiredName,
  businessType: z.enum(['vegetable', 'flour', 'milk', 'general']),
  sharePercent: z
    .string()
    .trim()
    .min(1, 'वाटा भरा')
    .refine(value => {
      try {
        const exact = money(value);
        return compareMoney(exact, 0) > 0 && compareMoney(exact, 100) <= 0;
      } catch {
        return false;
      }
    }, 'वाटा ० पेक्षा जास्त आणि १०० पर्यंत'),
});

type Values = z.infer<typeof schema>;

const BUSINESSES = (['vegetable', 'flour', 'milk', 'general'] as const).map(value => ({
  value,
  label: PARTNER_BUSINESS_LABEL[value],
}));

export function PartnerMasterScreen() {
  const partners = useAsyncData(() => loadReportSource(database).then(source => source.partners), []);
  const [editing, setEditing] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {name: '', businessType: 'vegetable', sharePercent: ''},
    mode: 'onChange',
  });
  const shareTotal = sumAmounts(partners.data.filter(row => row.active).map(row => row.sharePercent));

  async function submit(values: Values) {
    setFormError(null);
    try {
      await savePartner(database, {
        id: editing ?? undefined,
        name: values.name,
        sharePercent: Number(money(values.sharePercent)),
        businessType: values.businessType,
        active: partners.data.find(row => row.id === editing)?.active ?? true,
      });
      setEditing(null);
      form.reset({name: '', businessType: 'vegetable', sharePercent: ''});
      await partners.reload();
    } catch (error) {
      setFormError(error instanceof LedgerError ? error.message : 'जतन करता आले नाही');
    }
  }

  return (
    <FormScreen>
      <Text style={styles.help}>
        वाटा फक्त निवडलेल्या धंद्यावर मोजला जातो. भाजीत सामाईक विक्री आणि त्या धंद्याचा सामाईक खर्च. गिरणी, दूध किंवा इतर निवडल्यास त्या धंद्याचा सामाईक खर्चच धरला जातो.
      </Text>
      <Controller
        control={form.control}
        name="name"
        render={({field, fieldState}) => (
          <TextField
            label="नाव"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={form.control}
        name="businessType"
        render={({field}) => (
          <SelectField
            label="धंदा"
            value={field.value}
            options={BUSINESSES}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="sharePercent"
        render={({field, fieldState}) => (
          <TextField
            label="वाटा %"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            keyboardType="decimal-pad"
            placeholder="उदा. 40"
          />
        )}
      />
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button label={editing ? 'बदल जतन करा' : 'जोडा'} onPress={form.handleSubmit(submit)} />
      {editing ? (
        <Button
          label="रद्द"
          variant="secondary"
          onPress={() => {
            setEditing(null);
            form.reset({name: '', businessType: 'vegetable', sharePercent: ''});
          }}
        />
      ) : null}
      {compareMoney(shareTotal, 100) > 0 ? (
        <Text style={styles.error}>सक्रिय वाटा एकूण {shareTotal}% आहे.</Text>
      ) : (
        <Text style={styles.help}>सक्रिय वाटा एकूण {shareTotal}%.</Text>
      )}
      <View style={styles.list}>
        {partners.data.length === 0 ? <Text style={styles.help}>अजून भागीदार नाही.</Text> : null}
        {partners.data.map(partner => (
          <View key={partner.id} style={styles.row}>
            <Pressable
              style={styles.rowText}
              onPress={() => {
                setEditing(partner.id);
                form.reset({
                  name: partner.name,
                  businessType: (['vegetable', 'flour', 'milk', 'general'].includes(partner.businessType)
                    ? partner.businessType
                    : 'vegetable') as Values['businessType'],
                  sharePercent: String(Number(partner.sharePercent)),
                });
              }}>
              <Text style={styles.name}>{partner.name}</Text>
              <Text style={styles.meta}>
                {PARTNER_BUSINESS_LABEL[partner.businessType] ?? 'भाजी'} · {partner.sharePercent}%{partner.active ? '' : ' · बंद'}
              </Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await setPartnerActive(database, partner.id, !partner.active);
                await partners.reload();
              }}
              style={styles.toggle}>
              <Text style={styles.toggleLabel}>{partner.active ? 'बंद करा' : 'सुरू करा'}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  help: {fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted},
  error: {fontFamily: fonts.regular, fontSize: 15, color: colors.danger},
  list: {gap: spacing.sm},
  row: {
    minHeight: spacing.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  rowText: {flex: 1, paddingVertical: spacing.sm},
  name: {fontFamily: fonts.semibold, fontSize: 18, color: colors.text},
  meta: {fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted},
  toggle: {minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm},
  toggleLabel: {fontFamily: fonts.medium, fontSize: 15, color: colors.primary},
});
