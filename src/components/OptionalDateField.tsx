import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTx} from '../i18n/locale';
import {colors, fonts, formatIndianDate, spacing} from '../theme';
import {DatePickerModal} from './DatePickerModal';

type Props = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
};

export function OptionalDateField({label, value, onChange}: Props) {
  const tx = useTx();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{tx(label)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tx('तारीख निवडा')}
        onPress={() => setOpen(true)}
        style={styles.input}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatIndianDate(value) : 'DD/MM/YYYY'}
        </Text>
      </Pressable>
      {value ? (
        <Pressable onPress={() => onChange(null)} style={styles.clear}>
          <Text style={styles.clearLabel}>{tx('तारीख काढा')}</Text>
        </Pressable>
      ) : null}
      <DatePickerModal
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onSelect={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {gap: spacing.xs, flex: 1},
  label: {fontFamily: fonts.medium, fontSize: 16, color: colors.text},
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
    fontSize: 18,
    color: colors.text,
  },
  placeholder: {
    fontFamily: fonts.regular,
    fontSize: 18,
    color: colors.textMuted,
  },
  clear: {minHeight: 36, justifyContent: 'center'},
  clearLabel: {fontFamily: fonts.medium, fontSize: 14, color: colors.primary},
});
