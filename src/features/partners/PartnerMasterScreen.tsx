import {zodResolver} from '@hookform/resolvers/zod';
import React, {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {z} from 'zod';
import {Button, FormScreen, SelectField, TextField} from '../../components';
import {database} from '../../db';
import {loadReportSource} from '../../db/reportData';
import {loadGrains, loadVegetables} from '../../db/reads';
import {savePartner, setPartnerActive} from '../../db/writes';
import {compareMoney, LedgerError, money} from '../../domain/money';
import {overloadedScopes} from '../../domain/reports';
import {PARTNER_BUSINESS_LABEL} from '../../domain/labels';
import {requiredName} from '../../forms/fields';
import {useAsyncData} from '../../hooks/useAsyncData';
import {useTx} from '../../i18n/locale';
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
  const [productIds, setProductIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const tx = useTx();
  const vegetables = useAsyncData(() => loadVegetables(database), []);
  const grains = useAsyncData(() => loadGrains(database), []);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {name: '', businessType: 'vegetable', sharePercent: ''},
    mode: 'onChange',
  });
  const businessType = form.watch('businessType');
  const catalog =
    businessType === 'vegetable'
      ? vegetables.data.filter(row => row.active)
      : businessType === 'flour'
        ? grains.data.filter(row => row.active)
        : [];
  const overflows = overloadedScopes(partners.data);
  function resetForm() {
    setEditing(null);
    setProductIds([]);
    form.reset({name: '', businessType: 'vegetable', sharePercent: ''});
  }

  async function submit(values: Values) {
    setFormError(null);
    try {
      await savePartner(database, {
        id: editing ?? undefined,
        name: values.name,
        sharePercent: Number(money(values.sharePercent)),
        businessType: values.businessType,
        active: partners.data.find(row => row.id === editing)?.active ?? true,
        productIds: values.businessType === 'vegetable' || values.businessType === 'flour' ? productIds : [],
      });
      resetForm();
      await partners.reload();
    } catch (error) {
      setFormError(error instanceof LedgerError ? error.message : 'जतन करता आले नाही');
    }
  }

  return (
    <FormScreen>
      <Text style={styles.help}>
        {tx(
          'वाटा फक्त निवडलेल्या धंद्यावर मोजला जातो. भाजीत सामाईक विक्री आणि त्या धंद्याचा सामाईक खर्च. गिरणी, दूध किंवा इतर निवडल्यास त्या धंद्याचा सामाईक खर्चच धरला जातो.',
        )}
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
            options={BUSINESSES.map(item => ({...item, label: tx(item.label)}))}
            onChange={value => {
              field.onChange(value);
              setProductIds([]);
            }}
          />
        )}
      />
      {catalog.length > 0 ? (
        <View style={styles.products}>
          <Text style={styles.help}>
            {tx('उत्पादने निवडल्यास वाटा फक्त त्या मालाच्या विक्रीवर. रिकामे ठेवल्यास संपूर्ण धंदा.')}
          </Text>
          <View style={styles.chips}>
            {catalog.map(item => {
              const selected = productIds.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    setProductIds(current =>
                      current.includes(item.id)
                        ? current.filter(id => id !== item.id)
                        : [...current, item.id],
                    )
                  }
                  style={[styles.chip, selected ? styles.chipOn : null]}>
                  <Text style={[styles.chipLabel, selected ? styles.chipLabelOn : null]}>{tx(item.name)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
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
      {formError ? <Text style={styles.error}>{tx(formError)}</Text> : null}
      <Button label={editing ? 'बदल जतन करा' : 'जोडा'} onPress={form.handleSubmit(submit)} />
      {editing ? (
        <Button
          label="रद्द"
          variant="secondary"
          onPress={resetForm}
        />
      ) : null}
      {overflows.map(hit => (
        <Text key={`${hit.businessType}-${hit.productId ?? 'all'}`} style={styles.error}>
          {tx(PARTNER_BUSINESS_LABEL[hit.businessType] ?? 'भाजी')}
          {hit.productId ? ` · ${tx([...vegetables.data, ...grains.data].find(row => row.id === hit.productId)?.name ?? '')}` : ` · ${tx('संपूर्ण धंदा')}`}
          {' · '}
          {hit.total}% {tx('आहे. १००% पेक्षा जास्त.')}
        </Text>
      ))}
      <View style={styles.list}>
        {partners.data.length === 0 ? <Text style={styles.help}>{tx('अजून भागीदार नाही.')}</Text> : null}
        {partners.data.map(partner => (
          <View key={partner.id} style={styles.row}>
            <Pressable
              style={styles.rowText}
              onPress={() => {
                setEditing(partner.id);
                setProductIds(partner.productIds);
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
                {tx(PARTNER_BUSINESS_LABEL[partner.businessType] ?? 'भाजी')} ·{' '}
                {partner.productIds.length
                  ? partner.productIds
                      .map(id => tx([...vegetables.data, ...grains.data].find(row => row.id === id)?.name ?? ''))
                      .filter(Boolean)
                      .join(', ')
                  : tx('संपूर्ण धंदा')}{' '}
                · {partner.sharePercent}%
                {partner.active ? '' : ` · ${tx('बंद')}`}
              </Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await setPartnerActive(database, partner.id, !partner.active);
                await partners.reload();
              }}
              style={styles.toggle}>
              <Text style={styles.toggleLabel}>{partner.active ? tx('बंद करा') : tx('सुरू करा')}</Text>
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
  products: {gap: spacing.sm},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipLabel: {fontFamily: fonts.medium, fontSize: 16, color: colors.text},
  chipLabelOn: {color: '#FFFFFF'},
});
