import React, {useEffect} from 'react';
import {Controller} from 'react-hook-form';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {lineTotal, useAmountLineForm} from '../forms/amount';
import {colors, fonts, formatInr, spacing, typography} from '../theme';

type Props = {
  unit?: string;
  onTotalChange?: (total: number | null) => void;
};

export function AmountInput({unit = 'किलो', onTotalChange}: Props) {
  const form = useAmountLineForm();
  const quantity = form.watch('quantity');
  const rate = form.watch('rate');
  const total = lineTotal({quantity, rate});

  useEffect(() => {
    onTotalChange?.(total);
  }, [onTotalChange, total]);

  return (
    <View style={styles.wrap}>
      <Field
        control={form.control}
        name="quantity"
        label={`प्रमाण (${unit})`}
      />
      <Field control={form.control} name="rate" label="दर (₹)" />
      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>सेव्ह करण्यापूर्वी एकूण</Text>
        <Text style={typography.amount}>
          {total == null ? '—' : formatInr(total)}
        </Text>
      </View>
    </View>
  );
}

function Field({
  control,
  name,
  label,
}: {
  control: ReturnType<typeof useAmountLineForm>['control'];
  name: 'quantity' | 'rate';
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <View style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          {fieldState.error?.message ? (
            <Text style={styles.error}>{fieldState.error.message}</Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
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
  totalBox: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  totalLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textMuted,
  },
});
