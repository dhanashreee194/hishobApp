import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {dateFieldSchema, parseIndianDate} from '../forms/amount';
import {colors, fonts, formatIndianDate, spacing} from '../theme';

type Props = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
};

export function OptionalDateField({label, value, onChange}: Props) {
  const [text, setText] = useState(value ? formatIndianDate(value) : '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(value ? formatIndianDate(value) : '');
  }, [value]);

  function handleChange(next: string) {
    const digits = next.replace(/[^\d]/g, '').slice(0, 8);
    const formatted = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
      .filter(part => part.length > 0)
      .join('/');
    setText(formatted);
    if (!formatted) {
      setError(null);
      onChange(null);
      return;
    }
    const parsed = dateFieldSchema.safeParse(formatted);
    if (!parsed.success) {
      setError(formatted.length === 10 ? parsed.error.issues[0]?.message ?? null : null);
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
      {value ? (
        <Pressable onPress={() => onChange(null)} style={styles.clear}>
          <Text style={styles.clearLabel}>तारीख काढा</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    fontFamily: fonts.regular,
    fontSize: 18,
    color: colors.text,
  },
  clear: {minHeight: 36, justifyContent: 'center'},
  clearLabel: {fontFamily: fonts.medium, fontSize: 14, color: colors.primary},
  error: {fontFamily: fonts.regular, fontSize: 14, color: colors.danger},
});
