import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTx} from '../i18n/locale';
import {colors, fonts, formatIndianDate, spacing} from '../theme';
import {DatePickerModal} from './DatePickerModal';

type Props = {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
};

export function DateField({label = 'तारीख', value, onChange}: Props) {
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
        <Text style={styles.value}>{formatIndianDate(value)}</Text>
      </Pressable>
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
  field: {
    gap: spacing.xs,
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
    fontSize: 22,
    color: colors.text,
  },
});
