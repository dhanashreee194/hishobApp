import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, formatInr, spacing, typography} from '../theme';

type Props = {
  label: string;
  amount: number | null;
  hint?: string;
  tone?: 'in' | 'out' | 'neutral';
};

export function DerivedAmount({label, amount, hint, tone = 'neutral'}: Props) {
  const color =
    tone === 'in' ? colors.success : tone === 'out' ? colors.danger : colors.text;
  return (
    <View style={styles.box}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[typography.amount, {color}]}>
        {amount == null ? '—' : formatInr(amount)}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
  },
  hint: {
    ...typography.caption,
  },
});
