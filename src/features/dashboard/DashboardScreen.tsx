import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {RecordCard} from '../../components';
import {database} from '../../db';
import {confirmDelete} from '../records/confirmDelete';
import {loadRecent, loadTodaySummary} from '../../db/reads';
import {useAsyncData} from '../../hooks/useAsyncData';
import {RootStackParamList} from '../../navigation/types';
import {formatStamp, useSyncStatus} from '../../sync/status';
import {useCopy} from '../../i18n/locale';
import {colors, fonts, formatIndianDate, formatInr, spacing} from '../../theme';

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const copy = useCopy();
  const today = new Date();
  const summary = useAsyncData(() => loadTodaySummary(database, new Date()), {
    vegetableSales: 0,
    millIncome: 0,
    milkExpense: 0,
    otherExpenses: 0,
    udhariReceived: 0,
    net: 0,
  });
  const recent = useAsyncData(() => loadRecent(database), []);
  const lastSyncedAt = useSyncStatus(state => state.lastSyncedAt);
  const lastBackupAt = useSyncStatus(state => state.lastBackupAt);
  const syncing = useSyncStatus(state => state.syncing);
  const syncError = useSyncStatus(state => state.syncError);
  const actions: Array<{label: string; route: keyof RootStackParamList}> = [
    {label: copy.actionVeg, route: 'Tabs'},
    {label: copy.actionMill, route: 'FlourEntry'},
    {label: copy.actionMilk, route: 'Dairy'},
    {label: copy.actionExpense, route: 'ExpenseEntry'},
    {label: copy.actionPayment, route: 'ReceivePayment'},
  ];

  function open(route: keyof RootStackParamList) {
    if (route === 'Tabs') {
      navigation.navigate('Tabs', {screen: 'Bhaji'});
      return;
    }
    navigation.navigate(route as 'FlourEntry');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.date}>
        {formatIndianDate(today)} · {copy.weekdays[today.getDay()]}
      </Text>
      <Pressable onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.sync}>
          {copy.lastSync}: {syncing ? copy.syncing : lastSyncedAt == null ? copy.notYet : formatStamp(lastSyncedAt)}
        </Text>
        <Text style={styles.sync}>
          {copy.lastBackup}: {lastBackupAt == null ? copy.notYet : formatStamp(lastBackupAt)}</Text>
        {syncError ? <Text style={styles.syncError}>{syncError}</Text> : null}
      </Pressable>
      <View style={styles.grid}>
        <Stat label={copy.vegSales} amount={summary.data.vegetableSales} tone="in" />
        <Stat label={copy.millIncome} amount={summary.data.millIncome} tone="in" />
        <Stat label={copy.milkExpense} amount={summary.data.milkExpense} tone="out" />
        <Stat label={copy.otherExpenses} amount={summary.data.otherExpenses} tone="out" />
        <Stat label={copy.udhariIn} amount={summary.data.udhariReceived} tone="in" />
      </View>
      <View style={styles.net}>
        <Text style={styles.netLabel}>{copy.todayNet}</Text>
        <Text style={styles.netAmount}>{formatInr(summary.data.net)}</Text>
        <Text style={styles.netHint}>{copy.netHint}</Text>
      </View>
      <View style={styles.actions}>
        {actions.map(action => (
          <Pressable key={action.label} style={styles.action} onPress={() => open(action.route)}>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.section}>{copy.recent}</Text>
      <View style={styles.list}>
        {recent.data.length === 0 ? (
          <Text style={styles.hint}>{copy.recentEmpty}</Text>
        ) : null}
        {recent.data.map(item => (
          <RecordCard
            key={item.id}
            title={item.title}
            subtitle={`${formatIndianDate(new Date(item.date))} · ${item.subtitle}`}
            amount={item.amount}
            tone={item.tone}
            onPress={
              item.customerId
                ? () =>
                    navigation.navigate('CustomerDetail', {customerId: item.customerId as string})
                : undefined
            }
            onEdit={() => {
              if (item.sourceTable === 'flour_transactions') {
                navigation.navigate('FlourEntry', {entryId: item.sourceId});
              } else if (item.sourceTable === 'milk_entries') {
                navigation.navigate('Dairy', {entryId: item.sourceId});
              } else if (item.sourceTable === 'vegetable_sales') {
                navigation.navigate('Tabs', {
                  screen: 'Bhaji',
                  params: {editSaleId: item.sourceId},
                });
              } else if (item.sourceTable === 'expenses') {
                navigation.navigate('ExpenseEntry', {expenseId: item.sourceId});
              } else if (item.sourceTable === 'customer_ledger_entries' && item.customerId) {
                navigation.navigate('RecordPayment', {
                  customerId: item.customerId,
                  entryId: item.sourceId,
                });
              }
            }}
            onDelete={() => confirmDelete(item.sourceTable, item.sourceId, recent.reload)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function Stat({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number;
  tone: 'in' | 'out';
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statAmount, tone === 'out' ? styles.out : styles.in]}>
        {formatInr(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xl * 2,
    backgroundColor: colors.background,
  },
  date: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.text,
  },
  sync: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.primary,
  },
  syncError: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stat: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 88,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  statAmount: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  in: {
    color: colors.success,
  },
  out: {
    color: colors.danger,
  },
  net: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  netLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: '#E7F2EC',
  },
  netAmount: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: '#FFFFFF',
  },
  netHint: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#E7F2EC',
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.sm,
  },
  action: {
    minHeight: spacing.touch,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 26,
    color: colors.primary,
    textAlign: 'center',
  },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.text,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
