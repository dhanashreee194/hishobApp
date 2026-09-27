import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import React from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CustomerDetailScreen} from '../features/customers/CustomerDetailScreen';
import {CustomerFormScreen, CustomersScreen} from '../features/customers/CustomersScreen';
import {ReceivePaymentScreen, RecordPaymentScreen} from '../features/customers/RecordPaymentScreen';
import {DairyScreen} from '../features/dairy/DairyScreen';
import {MilkRateScreen} from '../features/dairy/MilkRateScreen';
import {DashboardScreen} from '../features/dashboard/DashboardScreen';
import {ExpensesScreen} from '../features/expenses/ExpensesScreen';
import {FlourEntryScreen} from '../features/flourmill/FlourEntryScreen';
import {FlourMillScreen} from '../features/flourmill/FlourMillScreen';
import {GrainMasterScreen} from '../features/flourmill/GrainMasterScreen';
import {GrainRateScreen} from '../features/flourmill/GrainRateScreen';
import {StockScreen} from '../features/stock/StockScreen';
import {ReportsScreen} from '../features/reports/ReportsScreen';
import {PartnerMasterScreen} from '../features/partners/PartnerMasterScreen';
import {DeletedRecordsScreen} from '../features/records/DeletedRecordsScreen';
import {SettingsScreen} from '../features/settings/SettingsScreen';
import {PartnerSettlementScreen} from '../features/partners/PartnerSettlementScreen';
import {LabourMasterScreen} from '../features/vegetable/LabourMasterScreen';
import {VegetableMasterScreen} from '../features/vegetable/VegetableMasterScreen';
import {VegetableScreen} from '../features/vegetable/VegetableScreen';
import {colors, fonts} from '../theme';
import {useCopy} from '../i18n/locale';
import {
  CreditIcon,
  HomeIcon,
  MillIcon,
  ProfileIcon,
  ReportsIcon,
  VegIcon,
} from '../components/Icons';
import {LanguageButton} from '../features/profile/LanguageButton';
import {ProfileScreen} from '../features/profile/ProfileScreen';
import {RootStackParamList, TabParamList} from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  const insets = useSafeAreaInsets();
  const copy = useCopy();
  const icon =
    (Glyph: typeof HomeIcon) =>
    ({color, size}: {color: string; size: number}) =>
      <Glyph color={color} size={size} />;
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleStyle: {
          fontFamily: fonts.semibold,
          fontSize: 20,
          color: colors.text,
        },
        headerStyle: {backgroundColor: colors.background},
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 11,
        },
        tabBarItemStyle: {minHeight: 52},
      }}>
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: copy.home,
          tabBarLabel: copy.home,
          tabBarIcon: icon(HomeIcon),
          headerRight: () => <LanguageButton />,
        }}
      />
      <Tab.Screen
        name="Bhaji"
        component={VegetableScreen}
        options={{
          title: copy.vegetables,
          tabBarLabel: copy.vegetables,
          tabBarIcon: icon(VegIcon),
        }}
      />
      <Tab.Screen
        name="Girni"
        component={FlourMillScreen}
        options={{title: copy.mill, tabBarLabel: copy.mill, tabBarIcon: icon(MillIcon)}}
      />
      <Tab.Screen
        name="Udhari"
        component={CustomersScreen}
        options={{title: copy.credit, tabBarLabel: copy.credit, tabBarIcon: icon(CreditIcon)}}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{title: copy.reports, tabBarLabel: copy.reports, tabBarIcon: icon(ReportsIcon)}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: copy.profile, tabBarLabel: copy.profile, tabBarIcon: icon(ProfileIcon)}}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const copy = useCopy();
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleStyle: {
          fontFamily: fonts.semibold,
          fontSize: 20,
          color: colors.text,
        },
        headerStyle: {backgroundColor: colors.background},
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        contentStyle: {backgroundColor: colors.background},
      }}>
      <Stack.Screen name="Tabs" component={Tabs} options={{headerShown: false}} />
      <Stack.Screen name="FlourEntry" component={FlourEntryScreen} options={{title: copy.flourEntry}} />
      <Stack.Screen name="GrainMaster" component={GrainMasterScreen} options={{title: copy.grains}} />
      <Stack.Screen name="GrainRates" component={GrainRateScreen} options={{title: copy.grainRates}} />
      <Stack.Screen name="Stock" component={StockScreen} options={{title: copy.stock}} />
      <Stack.Screen name="Dairy" component={DairyScreen} options={{title: copy.dairy}} />
      <Stack.Screen name="MilkRates" component={MilkRateScreen} options={{title: copy.milkRates}} />
      <Stack.Screen name="VegetableMaster" component={VegetableMasterScreen} options={{title: copy.vegetableList}} />
      <Stack.Screen name="LabourMaster" component={LabourMasterScreen} options={{title: copy.labour}} />
      <Stack.Screen name="ExpenseEntry" component={ExpensesScreen} options={{title: copy.expense}} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={{title: copy.newCustomer}} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{title: copy.customerAccount}} />
      <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} options={{title: copy.payment}} />
      <Stack.Screen name="ReceivePayment" component={ReceivePaymentScreen} options={{title: copy.whoPaid}} />
      <Stack.Screen name="PartnerMaster" component={PartnerMasterScreen} options={{title: copy.partners}} />
      <Stack.Screen name="PartnerSettlement" component={PartnerSettlementScreen} options={{title: copy.settlement}} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{title: copy.settings}} />
      <Stack.Screen
        name="DeletedRecords"
        component={DeletedRecordsScreen}
        options={{title: copy.deleted}}
      />
    </Stack.Navigator>
  );
}
