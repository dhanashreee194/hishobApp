import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTx} from '../i18n/locale';
import {colors, fonts, spacing} from '../theme';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  label: string;
  value: T;
  options: Array<Option<T>>;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: Props<T>) {
  const tx = useTx();
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{tx(label)}</Text>
      <View style={styles.row}>
        {options.map(option => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{selected}}
              onPress={() => onChange(option.value)}
              style={[styles.item, selected ? styles.selected : null]}>
              <Text style={[styles.itemLabel, selected ? styles.selectedLabel : null]}>
                {tx(option.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  item: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 96,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  itemLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    textAlign: 'center',
  },
  selectedLabel: {
    color: '#FFFFFF',
  },
});
