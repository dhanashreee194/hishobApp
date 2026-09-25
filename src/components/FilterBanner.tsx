import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {colors, fonts, formatIndianDate, spacing} from '../theme';

type Props = {
  from: number | null;
  to: number | null;
  onClear: () => void;
};

export function FilterBanner({from, to, onClear}: Props) {
  if (from == null && to == null) {
    return null;
  }
  const start = from == null ? 'सुरुवात' : formatIndianDate(new Date(from));
  const end = to == null ? 'शेवट' : formatIndianDate(new Date(to));
  return (
    <Pressable onPress={onClear} style={styles.banner}>
      <Text style={styles.text}>
        तारीख {start} – {end} · काढा
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.primary,
  },
});
