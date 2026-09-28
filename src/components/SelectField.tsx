import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTx} from '../i18n/locale';
import {colors, fonts, spacing} from '../theme';

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  placeholder = 'निवडा',
  allowEmpty = false,
  emptyLabel = 'नाही',
}: Props) {
  const tx = useTx();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.value === value);
  const visible = useMemo(() => {
    const q = query.trim();
    const filtered = q
      ? options.filter(option => {
          const blob = `${option.label} ${tx(option.label)} ${option.hint ?? ''} ${
            option.hint ? tx(option.hint) : ''
          }`.toLowerCase();
          return blob.includes(q.toLowerCase());
        })
      : options;
    return allowEmpty
      ? [{value: '', label: tx(emptyLabel)}, ...filtered]
      : filtered;
  }, [allowEmpty, emptyLabel, options, query, tx]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{tx(label)}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        style={styles.input}>
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected ? tx(selected.label) : tx(placeholder)}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{tx(error)}</Text> : null}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <Text style={styles.modalTitle}>{tx(label)}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={tx('शोधा')}
            placeholderTextColor={colors.textMuted}
            style={styles.search}
          />
          <FlatList
            data={visible}
            keyExtractor={item => item.value || 'empty'}
            keyboardShouldPersistTaps="handled"
            renderItem={({item}) => (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                style={styles.row}>
                <Text style={styles.rowLabel}>{tx(item.label)}</Text>
                {item.hint ? <Text style={styles.hint}>{tx(item.hint)}</Text> : null}
              </Pressable>
            )}
          />
          <Pressable onPress={() => setOpen(false)} style={styles.close}>
            <Text style={styles.closeLabel}>{tx('निवड बंद')}</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  input: {
    minHeight: spacing.touch,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.input,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  value: {
    fontFamily: fonts.regular,
    fontSize: 20,
    color: colors.text,
  },
  placeholder: {
    fontFamily: fonts.regular,
    fontSize: 20,
    color: colors.textMuted,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    color: colors.text,
  },
  search: {
    minHeight: spacing.touch,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.input,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 18,
    color: colors.text,
  },
  row: {
    minHeight: spacing.touch,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.text,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  close: {
    minHeight: spacing.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.primary,
  },
});
