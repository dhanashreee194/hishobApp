import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../theme';

type Props = {
  title: string;
  message: string;
};

export function EmptyState({title, message}: Props) {
  return (
    <View style={styles.container}>
      <Text style={typography.heading}>{title}</Text>
      <Text style={[typography.body, styles.message]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  message: {
    color: colors.textMuted,
  },
});
