import React from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  StyleSheet,
  Text,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fonts, spacing} from '../theme';

type Props<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: ListRenderItem<T>;
  header: React.ReactNode;
  empty: string;
};

export function RecordList<T>({data, keyExtractor, renderItem, header, empty}: Props<T>) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          ListHeaderComponent={<React.Fragment>{header}</React.Fragment>}
          ListEmptyComponent={<Text style={styles.empty}>{empty}</Text>}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  empty: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textMuted,
  },
});
