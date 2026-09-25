import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, fonts, spacing} from '../theme';
import {TextField} from './TextField';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  suggestions: string[];
  error?: string;
  placeholder?: string;
};

export function SuggestField({
  label,
  value,
  onChangeText,
  suggestions,
  error,
  placeholder,
}: Props) {
  const query = value.trim();
  const matches =
    query.length === 0
      ? []
      : suggestions
          .filter(item => item.includes(query) && item !== query)
          .slice(0, 6);

  return (
    <View style={styles.wrap}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={error}
        placeholder={placeholder}
      />
      {matches.length > 0 ? (
        <View style={styles.list}>
          {matches.map(item => (
            <Pressable key={item} onPress={() => onChangeText(item)} style={styles.row}>
              <Text style={styles.rowText}>{item}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: {
    fontFamily: fonts.regular,
    fontSize: 18,
    color: colors.text,
  },
});
