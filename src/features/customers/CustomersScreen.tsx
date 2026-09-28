import {zodResolver} from '@hookform/resolvers/zod';
import {CompositeNavigationProp, RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useMemo, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {z} from 'zod';
import {Button, FilterBanner, FormScreen, RecordCard, SearchField, TextField} from '../../components';
import {ReminderCard} from './ReminderCard';
import {database} from '../../db';
import {Customer} from '../../db/models';
import {loadCustomerBalances, loadTodayCollections} from '../../db/reads';
import {updateCustomer} from '../../db/updates';
import {saveCustomer} from '../../db/writes';
import {inDateRange, includesText} from '../../domain/listFilter';
import {businessLabel} from '../../domain/labels';
import {LedgerError, moneyNumber, sumAmounts} from '../../domain/money';
import {optionalMobile, requiredName} from '../../forms/fields';
import {useAsyncData} from '../../hooks/useAsyncData';
import {useListFilter} from '../../hooks/useListFilter';
import {RootStackParamList, TabParamList} from '../../navigation/types';
import {useTx} from '../../i18n/locale';
import {colors, fonts, formatInr, spacing} from '../../theme';

const schema = z.object({
  name: requiredName,
  mobile: optionalMobile,
  address: z.string(),
});

type Values = z.infer<typeof schema>;

export function CustomersScreen() {
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<TabParamList, 'Udhari'>,
        NativeStackNavigationProp<RootStackParamList>
      >
    >();
  const route = useRoute<RouteProp<TabParamList, 'Udhari'>>();
  const filter = useListFilter(route.params?.filter);
  const tx = useTx();
  const customers = useAsyncData(() => loadCustomerBalances(database), []);
  const collected = useAsyncData(() => loadTodayCollections(database, new Date()), []);
  const visible = useMemo(() => {
    return customers.data.filter(customer => {
      if (!customer.active && customer.balance === 0) {
        return false;
      }
      if (
        (filter.from != null || filter.to != null) &&
        !customer.entryDates.some(date => inDateRange(date, filter))
      ) {
        return false;
      }
      return (
        includesText(customer.name, filter.text) || includesText(customer.mobile, filter.text)
      );
    });
  }, [customers.data, filter]);

  return (
    <View style={styles.screen}>
      <SearchField
        value={filter.text}
        onChangeText={filter.setText}
        placeholder="नाव, मोबाईल किंवा नावाचा तुकडा"
      />
      <FilterBanner
        from={filter.from}
        to={filter.to}
        onClear={() => navigation.setParams({filter: undefined})}
      />
      <Button label="नवीन ग्राहक" onPress={() => navigation.navigate('CustomerForm')} />
      <ReminderCard />
      <FlatList
        style={styles.customers}
        data={visible}
        keyExtractor={item => item.id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.collectedTitle}>{tx('आज उधारी जमा')}</Text>
            {collected.data.length === 0 ? (
              <Text style={styles.empty}>
                {tx('आज अजून उधारीचे पैसे आलेले नाहीत. पेमेंट जमा केल्यावर इथे दिसेल.')}
              </Text>
            ) : (
              <>
                {collected.data.map(item => (
                  <RecordCard
                    key={item.id}
                    title={`${item.customerName} · जमा`}
                    subtitle={businessLabel(item.businessType)}
                    amount={item.amount}
                    amountHint="आज मिळाले"
                    tone="in"
                    onPress={() => navigation.navigate('CustomerDetail', {customerId: item.customerId})}
                  />
                ))}
                <Text style={styles.collectedTotal}>
                  {tx('एकूण आज जमा')}{' '}
                  {formatInr(moneyNumber(sumAmounts(collected.data.map(item => item.amount))))}
                </Text>
              </>
            )}
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter.text || filter.from != null || filter.to != null
              ? tx('या शोधात ग्राहक सापडला नाही.')
              : tx('अजून ग्राहक नाही.')}
          </Text>
        }
        renderItem={({item}) => (
          <RecordCard
            title={item.name}
            subtitle={item.mobile || item.address || 'उधारी खाते'}
            amount={item.balance}
            amountHint="बाकी"
            tone={item.balance > 0 ? 'out' : 'in'}
            onPress={() => navigation.navigate('CustomerDetail', {customerId: item.id})}
            onEdit={() => navigation.navigate('CustomerForm', {customerId: item.id})}
          />
        )}
      />
    </View>
  );
}

export function CustomerFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CustomerForm'>>();
  const customerId = route.params?.customerId;
  const [formError, setFormError] = useState<string | null>(null);
  const tx = useTx();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {name: '', mobile: '', address: ''},
    mode: 'onChange',
  });

  useEffect(() => {
    if (!customerId) {
      return;
    }
    let cancelled = false;
    database
      .get<Customer>('customers')
      .find(customerId)
      .then(customer => {
        if (cancelled) {
          return;
        }
        form.reset({
          name: customer.name,
          mobile: customer.mobile ?? '',
          address: customer.address ?? '',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, form]);

  async function submit(values: Values) {
    setFormError(null);
    try {
      if (customerId) {
        await updateCustomer(database, customerId, values);
      } else {
        await saveCustomer(database, values);
      }
      navigation.goBack();
    } catch (error) {
      setFormError(error instanceof LedgerError ? error.message : 'जतन करता आले नाही');
    }
  }

  return (
    <FormScreen>
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
        name="mobile"
        render={({field, fieldState}) => (
          <TextField
            label="मोबाईल"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            keyboardType="phone-pad"
          />
        )}
      />
      <Controller
        control={form.control}
        name="address"
        render={({field}) => (
          <TextField
            label="पत्ता"
            value={field.value}
            onChangeText={field.onChange}
            multiline
          />
        )}
      />
      {formError ? <Text style={styles.error}>{tx(formError)}</Text> : null}
      <Button label={customerId ? 'सुधार जतन करा' : 'ग्राहक जतन करा'} onPress={form.handleSubmit(submit)} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  customers: {
    flex: 1,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textMuted,
  },
  collectedTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
  },
  collectedTotal: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.success,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.danger,
  },
});
