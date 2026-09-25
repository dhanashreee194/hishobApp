import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {CompositeNavigationProp} from '@react-navigation/native';
import React, {useMemo} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, FilterBanner, RecordCard, SearchField} from '../../components';
import {database} from '../../db';
import {confirmDelete} from '../records/confirmDelete';
import {FlourListItem, loadFlourList} from '../../db/reads';
import {inDateRange} from '../../domain/listFilter';
import {STANDING_LABEL} from '../../domain/labels';
import {paymentStanding} from '../../domain/money';
import {useAsyncData} from '../../hooks/useAsyncData';
import {useListFilter} from '../../hooks/useListFilter';
import {RootStackParamList, TabParamList} from '../../navigation/types';
import {colors, fonts, formatIndianDate, spacing} from '../../theme';

export function FlourMillScreen() {
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<TabParamList, 'Girni'>,
        NativeStackNavigationProp<RootStackParamList>
      >
    >();
  const route = useRoute<RouteProp<TabParamList, 'Girni'>>();
  const filter = useListFilter(route.params?.filter);
  const list = useAsyncData(() => loadFlourList(database), []);
  const visible = useMemo(
    () => list.data.filter(item => matches(item, filter.text, filter.from, filter.to)),
    [list.data, filter.text, filter.from, filter.to],
  );

  return (
    <View style={styles.screen}>
      <SearchField
        value={filter.text}
        onChangeText={filter.setText}
        placeholder="ग्राहक, धान्य, तारीख किंवा रक्कम"
      />
      <FilterBanner
        from={filter.from}
        to={filter.to}
        onClear={() => navigation.setParams({filter: undefined})}
      />
      <View style={styles.actions}>
        <Button
          label="नवीन दळण"
          onPress={() => navigation.navigate('FlourEntry')}
          style={styles.action}
        />
        <Button
          label="धान्य"
          variant="secondary"
          onPress={() => navigation.navigate('GrainMaster')}
          style={styles.action}
        />
        <Button
          label="दर"
          variant="secondary"
          onPress={() => navigation.navigate('GrainRates')}
          style={styles.action}
        />
        <Button
          label="साठा"
          variant="secondary"
          onPress={() => navigation.navigate('Stock')}
          style={styles.action}
        />
      </View>
      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter.text || filter.from != null || filter.to != null
              ? 'या शोधात काही सापडले नाही.'
              : 'अजून दळण्याची नोंद नाही.'}
          </Text>
        }
        renderItem={({item}) => {
          const standing = paymentStanding(item.totalAmount, item.paidAmount);
          return (
            <RecordCard
              title={`${formatIndianDate(new Date(item.date))} · ${item.grainName}`}
              subtitle={`${item.quantity} ${item.unit}${item.customerName ? ` · ${item.customerName}` : ''}`}
              amount={item.totalAmount}
              amountHint={STANDING_LABEL[standing]}
              tone={standing === 'pending' ? 'out' : 'in'}
              onEdit={() => navigation.navigate('FlourEntry', {entryId: item.id})}
              onDelete={() => confirmDelete('flour_transactions', item.id, list.reload)}
            />
          );
        }}
      />
    </View>
  );
}

function matches(
  item: FlourListItem,
  query: string,
  from: number | null,
  to: number | null,
): boolean {
  if (!inDateRange(item.date, {from, to})) {
    return false;
  }
  const q = query.trim();
  if (!q) {
    return true;
  }
  const haystack = [
    item.customerName,
    item.grainName,
    formatIndianDate(new Date(item.date)),
    String(item.totalAmount),
    String(item.pendingAmount),
    String(item.paidAmount),
  ]
    .filter(Boolean)
    .join(' ');
  return haystack.includes(q);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  action: {
    flexGrow: 1,
    flexBasis: '47%',
    paddingHorizontal: spacing.sm,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textMuted,
    paddingTop: spacing.md,
  },
});
