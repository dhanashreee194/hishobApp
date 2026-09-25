import {Platform, TextStyle} from 'react-native';

/**
 * File names match the PostScript names, so the same family works on
 * Android (asset file name) and iOS (installed font name).
 */
export const fonts = {
  regular: 'NotoSansDevanagari-Regular',
  medium: 'NotoSansDevanagari-Medium',
  semibold: 'NotoSansDevanagari-SemiBold',
  bold: 'NotoSansDevanagari-Bold',
};

const base: TextStyle = {
  fontFamily: fonts.regular,
  color: '#1A1A1A',
  ...Platform.select({
    android: {includeFontPadding: false},
    default: {},
  }),
};

export const typography = {
  title: {
    ...base,
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 36,
  } satisfies TextStyle,
  heading: {
    ...base,
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 30,
  } satisfies TextStyle,
  body: {
    ...base,
    fontSize: 18,
    lineHeight: 28,
  } satisfies TextStyle,
  label: {
    ...base,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,
  amount: {
    ...base,
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 40,
  } satisfies TextStyle,
  caption: {
    ...base,
    fontSize: 14,
    lineHeight: 20,
    color: '#5C564E',
  } satisfies TextStyle,
};
