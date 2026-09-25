import React from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {colors, fonts, spacing} from '../theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'phone-pad';
  multiline?: boolean;
  editable?: boolean;
  secureTextEntry?: boolean;
  maxLength?: number;
};

export function TextField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  editable = true,
  secureTextEntry = false,
  maxLength,
}: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        style={[styles.input, multiline ? styles.multiline : null, !editable ? styles.locked : null]}
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
    fontSize: 20,
    color: colors.text,
  },
  multiline: {
    minHeight: 88,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  locked: {
    backgroundColor: colors.surface,
    color: colors.textMuted,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
  },
});
