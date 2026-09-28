import React from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {useTx} from '../i18n/locale';
import {colors, fonts, spacing} from '../theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function SearchField({
  value,
  onChangeText,
  placeholder = 'शोधा',
}: Props) {
  const tx = useTx();
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={tx(placeholder)}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
