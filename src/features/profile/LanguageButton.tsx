import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {useCopy, useLocale} from '../../i18n/locale';
import {colors, fonts, spacing} from '../../theme';

export function LanguageButton() {
  const locale = useLocale(state => state.locale);
  const setLocale = useLocale(state => state.setLocale);
  const copy = useCopy();
  const next = locale === 'mr' ? 'en' : 'mr';
  const label = locale === 'mr' ? copy.switchToEnglish : copy.switchToMarathi;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => setLocale(next)}
      style={({pressed}) => [styles.chip, pressed ? styles.pressed : null]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    marginRight: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {backgroundColor: colors.primaryPressed},
  label: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.surface,
  },
});
