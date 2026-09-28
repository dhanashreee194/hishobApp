import {create} from 'zustand';
import {database} from '../db';
import {translate} from './phrases';

export type Locale = 'mr' | 'en';

const KEY = 'mh_locale';

const mr = {
  home: 'होम',
  vegetables: 'भाजी',
  mill: 'गिरणी',
  credit: 'उधारी',
  reports: 'अहवाल',
  profile: 'प्रोफाइल',
  switchToEnglish: 'English',
  switchToMarathi: 'मराठी',
  language: 'भाषा',
  languageHint: 'होम, टॅब, फॉर्म आणि संदेश या भाषेत बदलतात.',
  period: 'काळ',
  notYet: 'अजून नाही',
  lastSync: 'शेवटचा सिंक',
  lastBackup: 'शेवटचा बॅकअप',
  syncing: 'चालू आहे…',
  vegSales: 'भाजी विक्री',
  millIncome: 'गिरणी उत्पन्न',
  milkExpense: 'दूध खर्च',
  otherExpenses: 'इतर खर्च',
  udhariIn: 'उधारी जमा',
  todayNet: 'आजचा निव्वळ',
  netHint: 'विक्री + गिरणी − दूध − खर्च. आज मिळालेली उधारी वर वेगळी दिसते.',
  actionVeg: 'भाजी विक्री',
  actionMill: 'गिरणी नोंद',
  actionMilk: 'दूध नोंद',
  actionExpense: 'खर्च',
  actionPayment: 'पेमेंट जमा',
  recent: 'अलीकडील नोंदी',
  recentEmpty: 'अजून नोंद नाही. वरच्या बटणावरून पहिली नोंद करा.',
  edit: 'सुधार',
  remove: 'काढा',
  customise: 'सानुकूल',
  customiseHint: 'यादी, दर, भागीदार, कुलूप आणि बॅकअप इथून बदला.',
  lists: 'यादी आणि दर',
  vegetableList: 'भाजी यादी',
  labour: 'मजुरी',
  grains: 'धान्य',
  grainRates: 'धान्य दर',
  milkRates: 'दूध दर',
  partners: 'भागीदार',
  settlement: 'भागीदारी हिशोब',
  safety: 'सुरक्षा आणि डेटा',
  deleted: 'काढलेल्या नोंदी',
  cloud: 'क्लाउड, बॅकअप आणि टीम',
  flourEntry: 'नवीन दळण',
  stock: 'साठा',
  dairy: 'दूध',
  expense: 'खर्च',
  newCustomer: 'नवीन ग्राहक',
  customerAccount: 'उधारी खाते',
  payment: 'पेमेंट',
  whoPaid: 'पेमेंट कोणाकडून?',
  settings: 'सेटिंग्ज',
  search: 'शोध',
  aroundDate: 'या तारखेभोवती',
  previous: 'मागील',
  next: 'पुढील',
  daily: 'दैनिक',
  monthly: 'मासिक',
  yearly: 'वार्षिक',
  progressive: 'प्रगती',
  partnership: 'भागीदारी',
  dairyShort: 'दूध',
  noRows: 'या काळात नोंद नाही.',
  excel: 'एक्सेल / CSV',
  pdf: 'PDF',
  saving: 'जतन होत आहे…',
  weekdays: ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
};

const en: typeof mr = {
  home: 'Home',
  vegetables: 'Veg',
  mill: 'Mill',
  credit: 'Credit',
  reports: 'Reports',
  profile: 'Profile',
  switchToEnglish: 'English',
  switchToMarathi: 'मराठी',
  language: 'Language',
  languageHint: 'Every screen follows this language.',
  period: 'Period',
  notYet: 'Not yet',
  lastSync: 'Last sync',
  lastBackup: 'Last backup',
  syncing: 'Syncing…',
  vegSales: 'Vegetable sales',
  millIncome: 'Mill income',
  milkExpense: 'Milk cost',
  otherExpenses: 'Other expenses',
  udhariIn: 'Credit received',
  todayNet: "Today's net",
  netHint: 'Sales + mill − milk − expenses. Credit received today is shown separately.',
  actionVeg: 'Vegetable sale',
  actionMill: 'Mill entry',
  actionMilk: 'Milk entry',
  actionExpense: 'Expense',
  actionPayment: 'Receive payment',
  recent: 'Recent entries',
  recentEmpty: 'No entries yet. Use a button above to add the first one.',
  edit: 'Edit',
  remove: 'Delete',
  customise: 'Customise',
  customiseHint: 'Change lists, rates, partners, the lock, and backup from here.',
  lists: 'Lists and rates',
  vegetableList: 'Vegetables',
  labour: 'Labour',
  grains: 'Grains',
  grainRates: 'Grain rates',
  milkRates: 'Milk rates',
  partners: 'Partners',
  settlement: 'Partner settlement',
  safety: 'Safety and data',
  deleted: 'Deleted entries',
  cloud: 'Cloud, backup, and team',
  flourEntry: 'New milling',
  stock: 'Stock',
  dairy: 'Milk',
  expense: 'Expense',
  newCustomer: 'New customer',
  customerAccount: 'Credit account',
  payment: 'Payment',
  whoPaid: 'Who is paying?',
  settings: 'Settings',
  search: 'Search',
  aroundDate: 'Around this date',
  previous: 'Previous',
  next: 'Next',
  daily: 'Daily',
  monthly: 'Monthly',
  yearly: 'Yearly',
  progressive: 'Progressive',
  partnership: 'Partnership',
  dairyShort: 'Milk',
  noRows: 'Nothing in this period.',
  excel: 'Excel / CSV',
  pdf: 'PDF',
  saving: 'Saving…',
  weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export type Copy = typeof mr;

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocale = create<LocaleState>(set => ({
  locale: 'mr',
  setLocale: locale => {
    set({locale});
    database.localStorage.set(KEY, locale).catch(() => undefined);
  },
}));

export function useCopy(): Copy {
  const locale = useLocale(state => state.locale);
  return locale === 'en' ? en : mr;
}

export function useTx() {
  const locale = useLocale(state => state.locale);
  return (value: string | null | undefined) => translate(locale, value ?? '');
}

export function headerIn(locale: Locale, header: string): string {
  if (locale === 'mr') {
    return header;
  }
  const labels: Record<string, string> = {
    उत्पन्न: 'Income',
    भरले: 'Paid',
    बाकी: 'Due',
    एकत्रित: 'Running',
    लिटर: 'Litres',
    रक्कम: 'Amount',
    विक्री: 'Sales',
    खर्च: 'Expense',
    निव्वळ: 'Net',
    'एकत्रित निव्वळ': 'Running net',
    उधार: 'Credit',
    जमा: 'Received',
    शिल्लक: 'Balance',
    भागीदार: 'Partner',
    मालक: 'Owner',
    दिलेले: 'Paid out',
    देय: 'Payable',
  };
  return labels[header] ?? header;
}

export async function hydrateLocale(): Promise<void> {
  const stored = await database.localStorage.get<Locale>(KEY);
  if (stored === 'en' || stored === 'mr') {
    useLocale.setState({locale: stored});
  }
}
