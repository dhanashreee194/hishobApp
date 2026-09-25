import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, fonts, formatInr, spacing} from '../theme';
import {useCopy} from '../i18n/locale';

type Props = {
  title: string;
  subtitle?: string;
  amount?: number;
  amountHint?: string;
  tone?: 'in' | 'out' | 'neutral';
  onPress?: () => void;
  onLongPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function RecordCard({
  title,
  subtitle,
  amount,
  amountHint,
  tone = 'neutral',
  onPress,
  onLongPress,
  onEdit,
  onDelete,
}: Props) {
  const copy = useCopy();
  const color =
    tone === 'in' ? colors.success : tone === 'out' ? colors.danger : colors.text;
  const body = (
    <View style={styles.card}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {amount != null ? (
        <View style={styles.amountWrap}>
          <Text style={[styles.amount, {color}]}>{formatInr(amount)}</Text>
          {amountHint ? <Text style={styles.hint}>{amountHint}</Text> : null}
        </View>
      ) : null}
    </View>
  );
  const card =
    !onPress && !onLongPress && !onDelete ? (
      body
    ) : (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onLongPress={onDelete ?? onLongPress}>
        {body}
      </Pressable>
    );
  if (!onEdit && !onDelete) {
    return card;
  }
  return (
    <View style={styles.block}>
      {card}
      <View style={styles.actions}>
        {onEdit ? (
          <Pressable style={styles.action} onPress={onEdit} accessibilityRole="button">
            <Text style={styles.edit}>{copy.edit}</Text>
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable style={styles.action} onPress={onDelete} accessibilityRole="button">
            <Text style={styles.remove}>{copy.remove}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: spacing.touch,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  amountWrap: {
    flexShrink: 0,
    maxWidth: '46%',
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'right',
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  block: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  edit: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.primary,
  },
  remove: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.danger,
  },
});
