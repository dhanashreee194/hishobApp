import React, {useState} from 'react';
import {Alert, FlatList, StyleSheet, Text, View} from 'react-native';
import {RecordCard} from '../../components';
import {database} from '../../db';
import {DeletedRecord, loadDeletedRecords, restoreRecord} from '../../db/deletion';
import {useAsyncData} from '../../hooks/useAsyncData';
import {colors, fonts, formatIndianDate, spacing} from '../../theme';

export function DeletedRecordsScreen() {
  const deleted = useAsyncData(() => loadDeletedRecords(database), []);
  const [busyId, setBusyId] = useState<string | null>(null);

  function confirmRestore(item: DeletedRecord) {
    Alert.alert('नोंद परत आणायची?', `${item.title} पुन्हा हिशोबात दिसेल.`, [
      {text: 'रद्द', style: 'cancel'},
      {
        text: 'परत आणा',
        onPress: () => {
          setBusyId(item.id);
          restoreRecord(database, item.table, item.id)
            .then(() => deleted.reload())
            .catch(() => undefined)
            .finally(() => setBusyId(null));
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={deleted.data}
        keyExtractor={item => `${item.table}-${item.id}`}
        initialNumToRender={8}
        windowSize={7}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.help}>
            काढलेल्या आर्थिक नोंदी येथे राहतात. मालक त्या परत आणू शकतो. रक्कम आणि तारीख जशा होत्या तशा राहतात.
          </Text>
        }
        ListEmptyComponent={<Text style={styles.empty}>काढलेली नोंद नाही.</Text>}
        renderItem={({item}) => (
          <RecordCard
            title={`${item.date ? formatIndianDate(new Date(item.date)) : 'तारीख नाही'} · ${item.title}`}
            subtitle={busyId === item.id ? 'परत आणत आहे…' : item.subtitle}
            amount={item.amount ?? undefined}
            onPress={() => confirmRestore(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  list: {padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl},
  help: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  empty: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textMuted,
  },
});
