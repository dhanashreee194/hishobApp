import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button, RecordCard, RecordList} from '../../components';
import {database} from '../../db';
import {loadLedger} from '../../db/reads';
import {confirmDelete} from '../records/confirmDelete';
import {businessLabel, PAYMENT_MODE_LABEL} from '../../domain/labels';
import {useAsyncData} from '../../hooks/useAsyncData';
import {RootStackParamList} from '../../navigation/types';
import {colors, fonts, formatIndianDate, formatInr, spacing} from '../../theme';

export function CustomerDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CustomerDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const ledger = useAsyncData(
    () => loadLedger(database, route.params.customerId),
    {customer: null, lines: []},
  );
  const customer = ledger.data.customer;

  return (
    <RecordList
      data={ledger.data.lines}
      keyExtractor={line => line.id}
      empty="अजून उधारी नोंद नाही."
      renderItem={({item: line}) => (
        <RecordCard
          title={`${formatIndianDate(new Date(line.date))} · ${
            line.type === 'payment' ? 'जमा' : 'उधार'
          }`}
          subtitle={[
            businessLabel(line.businessType),
            line.paymentMode ? PAYMENT_MODE_LABEL[line.paymentMode] : null,
            line.notes,
            `शिल्लक ${formatInr(line.running)}`,
          ]
            .filter(Boolean)
            .join(' · ')}
          amount={line.amount}
          tone={line.type === 'payment' ? 'in' : 'out'}
          onEdit={() => {
            if (line.referenceId && line.businessType === 'flour') {
              navigation.navigate('FlourEntry', {entryId: line.referenceId});
              return;
            }
            if (line.type === 'payment' && !line.referenceId) {
              navigation.navigate('RecordPayment', {
                customerId: route.params.customerId,
                entryId: line.id,
              });
            }
          }}
          onDelete={() => confirmDelete('customer_ledger_entries', line.id, ledger.reload)}
        />
      )}
      header={
        <>
          <Text style={styles.name}>{customer?.name ?? 'ग्राहक'}</Text>
          {customer?.mobile ? <Text style={styles.meta}>{customer.mobile}</Text> : null}
          {customer?.address ? <Text style={styles.meta}>{customer.address}</Text> : null}
          <View style={styles.balance}>
            <Text style={styles.balanceLabel}>सध्याची बाकी</Text>
            <Text style={styles.balanceAmount}>{formatInr(customer?.balance ?? 0)}</Text>
            <Text style={styles.meta}>उधार वजा जमा. ही रक्कम आपोआप मोजली जाते.</Text>
          </View>
          <Button
            label="ग्राहक सुधारा"
            variant="secondary"
            onPress={() => navigation.navigate('CustomerForm', {customerId: route.params.customerId})}
          />
          <Button
            label="पेमेंट नोंदवा"
            onPress={() =>
              navigation.navigate('RecordPayment', {customerId: route.params.customerId})
            }
            disabled={!customer || customer.balance <= 0}
          />
          <Text style={styles.section}>खातेवही</Text>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  name: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textMuted,
  },
  balance: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  balanceLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textMuted,
  },
  balanceAmount: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: colors.danger,
  },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.text,
  },
});
