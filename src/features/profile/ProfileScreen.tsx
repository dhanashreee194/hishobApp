import {CompositeNavigationProp, useNavigation} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  CreditIcon,
  ListIcon,
  LockIcon,
  MillIcon,
  ProfileIcon,
  VegIcon,
} from '../../components/Icons';
import {LanguageButton} from './LanguageButton';
import {AppLockSection} from '../lock/AppLockSection';
import {useCopy} from '../../i18n/locale';
import {RootStackParamList, TabParamList} from '../../navigation/types';
import {useSyncStatus} from '../../sync/status';
import {colors, fonts, spacing} from '../../theme';

type ProfileRoute =
  | 'Businesses'
  | 'VegetableMaster'
  | 'LabourMaster'
  | 'GrainMaster'
  | 'GrainRates'
  | 'MilkRates'
  | 'PartnerMaster'
  | 'PartnerSettlement'
  | 'DeletedRecords'
  | 'Settings';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const copy = useCopy();
  const assistant = useSyncStatus(state => state.role === 'assistant');
  const rows: Array<{
    label: string;
    icon: typeof VegIcon;
    route: ProfileRoute;
    hidden?: boolean;
  }> = [
    {label: copy.myBusinesses, icon: ListIcon, route: 'Businesses'},
    {label: copy.vegetableList, icon: VegIcon, route: 'VegetableMaster'},
    {label: copy.labour, icon: ListIcon, route: 'LabourMaster'},
    {label: copy.grains, icon: MillIcon, route: 'GrainMaster'},
    {label: copy.grainRates, icon: MillIcon, route: 'GrainRates'},
    {label: copy.milkRates, icon: CreditIcon, route: 'MilkRates'},
    {label: copy.partners, icon: ProfileIcon, route: 'PartnerMaster', hidden: assistant},
    {label: copy.settlement, icon: ProfileIcon, route: 'PartnerSettlement', hidden: assistant},
    {label: copy.deleted, icon: LockIcon, route: 'DeletedRecords', hidden: assistant},
    {label: copy.cloud, icon: ListIcon, route: 'Settings'},
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{copy.customise}</Text>
      <Text style={styles.hint}>{copy.customiseHint}</Text>
      <Text style={styles.section}>{copy.language}</Text>
      <Text style={styles.hint}>{copy.languageHint}</Text>
      <View style={styles.lang}>
        <LanguageButton />
      </View>
      <Text style={styles.section}>{copy.lists}</Text>
      {rows
        .filter(row => !row.hidden)
        .map(row => (
          <Pressable
            key={row.route + row.label}
            style={styles.row}
            onPress={() => navigation.navigate(row.route)}>
            <View style={styles.iconBox}>
              <row.icon color={colors.primary} size={22} />
            </View>
            <Text style={styles.rowLabel}>{row.label}</Text>
          </Pressable>
        ))}
      <Text style={styles.section}>{copy.safety}</Text>
      <AppLockSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},
  heading: {fontFamily: fonts.bold, fontSize: 28, color: colors.text},
  section: {fontFamily: fonts.semibold, fontSize: 18, color: colors.text, marginTop: spacing.sm},
  hint: {fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, lineHeight: 22},
  lang: {alignItems: 'flex-start'},
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E7F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {fontFamily: fonts.semibold, fontSize: 17, color: colors.text, flex: 1},
});
