import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {dateFieldSchema, parseIndianDate} from '../forms/amount';
import {colors, fonts, formatIndianDate, spacing} from '../theme';

type Props = {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
};

export function DateField({label = 'तारीख', value, onChange}: Props) {
  const [text, setText] = useState(formatIndianDate(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(formatIndianDate(value));
  }, [value]);

  function handleChange(next: string) {
    const digits = next.replace(/[^\d]/g, '').slice(0, 8);
    const formatted = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
      .filter(part => part.length > 0)
      .join('/');
    setText(formatted);

    const parsed = dateFieldSchema.safeParse(formatted);
    if (!parsed.success) {
      setError(
        formatted.length === 10 ? parsed.error.issues[0]?.message ?? null : null,
      );
      return;
    }

    const date = parseIndianDate(parsed.data);
    if (!date) {
      setError('ही तारीख योग्य नाही');
      return;
    }
    setError(null);
    onChange(date);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={handleChange}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        placeholderTextColor={colors.textMuted}
        maxLength={10}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    fontFamily: fonts.regular,
    fontSize: 22,
    color: colors.text,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
  },
});
