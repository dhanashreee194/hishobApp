import {Database} from '@nozbe/watermelondb';
import {notDeleted} from './queries';
import {isSameDay} from '../domain/dates';
import {MILK_RATE_ITEM_ID, businessLabel, flourDisplayName} from '../domain/labels';
import {
  balanceFromEntries,
  businessNet,
  moneyNumber,
  runningBalances,
  sumAmounts,
} from '../domain/money';
import {
  Customer,
  CustomerLedgerEntry,
  Expense,
  ExpenseCategory,
  FlourItem,
  FlourTransaction,
  GrainMaster,
  MilkEntry,
  VegetableMaster,
  VegetableSale,
  VegetableSaleItem,
} from './models';

export type NamedMaster = {
  id: string;
  name: string;
  unit: string;
  active: boolean;
};

export type TodaySummary = {
  vegetableSales: number;
  millIncome: number;
  milkExpense: number;
  otherExpenses: number;
  udhariReceived: number;
  net: number;
};

export type TodayCollection = {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  businessType: string;
};

export type RecentItem = {
  id: string;
  date: number;
  title: string;
  subtitle: string;
  amount: number;
  tone: 'in' | 'out';
  customerId?: string;
  sourceTable: string;
  sourceId: string;
};

export type FlourListItem = {
  id: string;
  date: number;
  customerName: string | null;
  grainName: string;
  quantity: number;
  unit: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
};

export type MilkListItem = {
  id: string;
  date: number;
  supplier: string;
  litres: number;
  rate: number;
  amount: number;
};

export type CustomerBalance = {
  id: string;
  name: string;
  mobile: string;
  address: string;
  active: boolean;
  balance: number;
  entryDates: number[];
};

export type LedgerLine = {
  id: string;
  date: number;
  type: string;
  amount: number;
  businessType: string;
  notes: string | null;
  paymentMode: string | null;
  referenceId: string | null;
  running: number;
};

export type CategoryOption = {
  id: string;
  name: string;
  businessType: string;
  categoryGroup: string;
  active: boolean;
};

export type VegetableActivity = {
  id: string;
  sourceTable: string;
  sourceId: string;
  date: number;
  title: string;
  subtitle: string;
  amount: number;
  tone: 'in' | 'out';
};

function byDateDesc<T extends {date: number}>(rows: T[]): T[] {
  return [...rows].sort((left, right) => right.date - left.date);
}

export async function loadGrains(database: Database): Promise<NamedMaster[]> {
  const rows = await database.get<GrainMaster>('grain_masters').query().fetch();
  return rows
    .map(row => ({
      id: row.id,
      name: row.name,
      unit: row.defaultUnit,
      active: row.active,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'mr'));
}

export async function loadVegetables(database: Database): Promise<NamedMaster[]> {
  const rows = await database.get<VegetableMaster>('vegetable_masters').query().fetch();
  return rows
    .map(row => ({
      id: row.id,
      name: row.name,
      unit: row.defaultUnit,
      active: row.active,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'mr'));
}

export async function loadCategories(database: Database): Promise<CategoryOption[]> {
  const rows = await database.get<ExpenseCategory>('expense_categories').query().fetch();
  return rows
    .map(row => ({
      id: row.id,
      name: row.name,
      businessType: row.businessType,
      categoryGroup: row.categoryGroup,
      active: row.active,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'mr'));
}

export async function loadTodaySummary(
  database: Database,
  day: Date,
): Promise<TodaySummary> {
  const [sales, flour, milk, expenses, ledger] = await Promise.all([
    database.get<VegetableSale>('vegetable_sales').query(notDeleted()).fetch(),
    database.get<FlourTransaction>('flour_transactions').query(notDeleted()).fetch(),
    database.get<MilkEntry>('milk_entries').query(notDeleted()).fetch(),
    database.get<Expense>('expenses').query(notDeleted()).fetch(),
    database.get<CustomerLedgerEntry>('customer_ledger_entries').query(notDeleted()).fetch(),
  ]);
  const vegetableSales = sumAmounts(
    sales.filter(row => isSameDay(row.date, day)).map(row => row.totalAmount),
  );
  const millIncome = sumAmounts(
    flour.filter(row => isSameDay(row.date, day)).map(row => row.totalAmount),
  );
  const milkExpense = sumAmounts(
    milk.filter(row => isSameDay(row.date, day)).map(row => row.amount),
  );
  const otherExpenses = sumAmounts(
    expenses.filter(row => isSameDay(row.date, day)).map(row => row.amount),
  );
  const received = ledger.filter(row => row.type === 'payment' && isSameDay(row.date, day));
  const udhariReceived = sumAmounts(received.map(row => row.amount));
  return {
    vegetableSales: moneyNumber(vegetableSales),
    millIncome: moneyNumber(millIncome),
    milkExpense: moneyNumber(milkExpense),
    otherExpenses: moneyNumber(otherExpenses),
    udhariReceived: moneyNumber(udhariReceived),
    net: moneyNumber(
      businessNet({vegetableSales, millIncome, milkExpense, otherExpenses}),
    ),
  };
}

export async function loadTodayCollections(
  database: Database,
  day: Date,
): Promise<TodayCollection[]> {
  const [ledger, customers] = await Promise.all([
    database.get<CustomerLedgerEntry>('customer_ledger_entries').query(notDeleted()).fetch(),
    database.get<Customer>('customers').query().fetch(),
  ]);
  const customerName = new Map(customers.map(row => [row.id, row.name]));
  return ledger
    .filter(row => row.type === 'payment' && isSameDay(row.date, day))
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .map(row => ({
      id: row.id,
      customerId: row.customerId,
      customerName: customerName.get(row.customerId) ?? 'ग्राहक',
      amount: row.amount,
      businessType: row.businessType,
    }));
}

export async function loadRecent(database: Database): Promise<RecentItem[]> {
  const [sales, saleItems, vegetables, flour, flourItems, grains, customers, milk, expenses, categories, payments] =
    await Promise.all([
      database.get<VegetableSale>('vegetable_sales').query(notDeleted()).fetch(),
      database.get<VegetableSaleItem>('vegetable_sale_items').query(notDeleted()).fetch(),
      database.get<VegetableMaster>('vegetable_masters').query().fetch(),
      database.get<FlourTransaction>('flour_transactions').query(notDeleted()).fetch(),
      database.get<FlourItem>('flour_items').query(notDeleted()).fetch(),
      database.get<GrainMaster>('grain_masters').query().fetch(),
      database.get<Customer>('customers').query().fetch(),
      database.get<MilkEntry>('milk_entries').query(notDeleted()).fetch(),
      database.get<Expense>('expenses').query(notDeleted()).fetch(),
      database.get<ExpenseCategory>('expense_categories').query().fetch(),
      database.get<CustomerLedgerEntry>('customer_ledger_entries').query(notDeleted()).fetch(),
    ]);
  const vegetableName = new Map(vegetables.map(row => [row.id, row.name]));
  const grainName = new Map(grains.map(row => [row.id, row.name]));
  const customerName = new Map(customers.map(row => [row.id, row.name]));
  const categoryName = new Map(categories.map(row => [row.id, row.name]));
  const itemsBySale = group(saleItems, item => item.saleId);
  const itemsByFlour = group(flourItems, item => item.transactionId);

  const recent: RecentItem[] = [
    ...sales.map(sale => ({
      id: `veg-${sale.id}`,
      date: sale.date.getTime(),
      title: 'भाजी विक्री',
      subtitle: (itemsBySale.get(sale.id) ?? [])
        .map(
          item =>
            `${vegetableName.get(item.vegetableId) ?? 'भाजी'} · ${item.quantity} ${item.unit}`,
        )
        .join(', '),
      amount: sale.totalAmount,
      tone: 'in' as const,
      sourceTable: 'vegetable_sales',
      sourceId: sale.id,
    })),
    ...flour.map(txn => {
      const lines = itemsByFlour.get(txn.id) ?? [];
      return {
        id: `flour-${txn.id}`,
        date: txn.date.getTime(),
        title: 'गिरणी',
        subtitle: [
          lines
            .map(item =>
              flourDisplayName(grainName.get(item.grainId) ?? 'धान्य', item.customName),
            )
            .join(', '),
          txn.customerId ? customerName.get(txn.customerId) : null,
        ]
          .filter(Boolean)
          .join(' · '),
        amount: txn.totalAmount,
        tone: 'in' as const,
        customerId: txn.customerId ?? undefined,
        sourceTable: 'flour_transactions',
        sourceId: txn.id,
      };
    }),
    ...milk.map(entry => ({
      id: `milk-${entry.id}`,
      date: entry.date.getTime(),
      title: 'दूध',
      subtitle: entry.supplierIdOrName,
      amount: entry.amount,
      tone: 'out' as const,
      sourceTable: 'milk_entries',
      sourceId: entry.id,
    })),
    ...expenses.map(expense => ({
      id: `exp-${expense.id}`,
      date: expense.date.getTime(),
      title: expense.categoryId
        ? (categoryName.get(expense.categoryId) ?? 'खर्च')
        : 'खर्च',
      subtitle: businessLabel(expense.businessType),
      amount: expense.amount,
      tone: 'out' as const,
      sourceTable: 'expenses',
      sourceId: expense.id,
    })),
    ...payments
      .filter(entry => entry.type === 'payment' && !entry.referenceId)
      .map(entry => ({
        id: `pay-${entry.id}`,
        date: entry.date.getTime(),
        title: 'पेमेंट जमा',
        subtitle: entry.customerId ? (customerName.get(entry.customerId) ?? '') : '',
        amount: entry.amount,
        tone: 'in' as const,
        customerId: entry.customerId,
        sourceTable: 'customer_ledger_entries',
        sourceId: entry.id,
      })),
  ];
  return byDateDesc(recent).slice(0, 20);
}

export async function loadFlourList(database: Database): Promise<FlourListItem[]> {
  const [transactions, items, customers, grains] = await Promise.all([
    database.get<FlourTransaction>('flour_transactions').query(notDeleted()).fetch(),
    database.get<FlourItem>('flour_items').query(notDeleted()).fetch(),
    database.get<Customer>('customers').query().fetch(),
    database.get<GrainMaster>('grain_masters').query().fetch(),
  ]);
  const customerName = new Map(customers.map(row => [row.id, row.name]));
  const grainName = new Map(grains.map(row => [row.id, row.name]));
  const itemsByTxn = group(items, item => item.transactionId);
  return byDateDesc(
    transactions.map(txn => {
      const lines = itemsByTxn.get(txn.id) ?? [];
      const first = lines[0];
      return {
        id: txn.id,
        date: txn.date.getTime(),
        customerName: txn.customerId ? (customerName.get(txn.customerId) ?? null) : null,
        grainName: lines
          .map(item => flourDisplayName(grainName.get(item.grainId) ?? 'धान्य', item.customName))
          .join(', '),
        quantity: first?.quantity ?? 0,
        unit: first?.unit ?? '',
        totalAmount: txn.totalAmount,
        paidAmount: txn.paidAmount,
        pendingAmount: txn.pendingAmount,
      };
    }),
  );
}

export async function loadMilkList(database: Database): Promise<MilkListItem[]> {
  const rows = await database.get<MilkEntry>('milk_entries').query(notDeleted()).fetch();
  return byDateDesc(
    rows.map(row => ({
      id: row.id,
      date: row.date.getTime(),
      supplier: row.supplierIdOrName,
      litres: row.quantityLitres,
      rate: row.appliedRate,
      amount: row.amount,
    })),
  );
}

export async function loadSupplierNames(database: Database): Promise<string[]> {
  const rows = await loadMilkList(database);
  return [...new Set(rows.map(row => row.supplier.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'mr'),
  );
}

export async function loadCustomerBalances(
  database: Database,
): Promise<CustomerBalance[]> {
  const [customers, entries] = await Promise.all([
    database.get<Customer>('customers').query().fetch(),
    database.get<CustomerLedgerEntry>('customer_ledger_entries').query(notDeleted()).fetch(),
  ]);
  const byCustomer = group(entries, entry => entry.customerId);
  return customers
    .map(customer => ({
      id: customer.id,
      name: customer.name,
      mobile: customer.mobile ?? '',
      address: customer.address ?? '',
      active: customer.active,
      balance: balanceOf(byCustomer.get(customer.id) ?? []),
      entryDates: (byCustomer.get(customer.id) ?? []).map(entry => entry.date.getTime()),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'mr'));
}

export async function loadLedger(
  database: Database,
  customerId: string,
): Promise<{customer: CustomerBalance | null; lines: LedgerLine[]}> {
  const customers = await loadCustomerBalances(database);
  const customer = customers.find(row => row.id === customerId) ?? null;
  const entries = await database
    .get<CustomerLedgerEntry>('customer_ledger_entries')
    .query(notDeleted())
    .fetch();
  const own = entries
    .filter(entry => entry.customerId === customerId)
    .sort((left, right) => left.date.getTime() - right.date.getTime());
  const balances = runningBalances(
    own.map(entry => ({type: entry.type, amount: entry.amount})),
  );
  const lines = own.map((entry, index) => ({
    id: entry.id,
    date: entry.date.getTime(),
    type: entry.type,
    amount: entry.amount,
    businessType: entry.businessType,
    notes: entry.notes,
    paymentMode: entry.paymentMode,
    referenceId: entry.referenceId,
    running: moneyNumber(balances[index]),
  }));
  return {customer, lines};
}

export async function loadVegetableActivity(
  database: Database,
): Promise<VegetableActivity[]> {
  const [sales, items, vegetables, expenses, categories] = await Promise.all([
    database.get<VegetableSale>('vegetable_sales').query(notDeleted()).fetch(),
    database.get<VegetableSaleItem>('vegetable_sale_items').query(notDeleted()).fetch(),
    database.get<VegetableMaster>('vegetable_masters').query().fetch(),
    database.get<Expense>('expenses').query(notDeleted()).fetch(),
    database.get<ExpenseCategory>('expense_categories').query().fetch(),
  ]);
  const vegetableName = new Map(vegetables.map(row => [row.id, row.name]));
  const categoryName = new Map(categories.map(row => [row.id, row.name]));
  const itemsBySale = group(items, item => item.saleId);
  const activity: VegetableActivity[] = [
    ...sales.map(sale => ({
      id: `sale-${sale.id}`,
      sourceTable: 'vegetable_sales',
      sourceId: sale.id,
      date: sale.date.getTime(),
      title: sale.ownershipType === 'shared' ? 'सामाईक विक्री' : 'स्वतःची विक्री',
      subtitle: (itemsBySale.get(sale.id) ?? [])
        .map(
          item =>
            `${vegetableName.get(item.vegetableId) ?? 'भाजी'} · ${item.quantity} ${item.unit}`,
        )
        .join(', '),
      amount: sale.totalAmount,
      tone: 'in' as const,
    })),
    ...expenses
      .filter(expense => expense.businessType === 'vegetable')
      .map(expense => ({
        id: `expense-${expense.id}`,
        sourceTable: 'expenses',
        sourceId: expense.id,
        date: expense.date.getTime(),
        title: expense.categoryId
          ? (categoryName.get(expense.categoryId) ?? 'खर्च')
          : 'खर्च',
        subtitle: expense.notes?.trim() || 'भाजी खर्च',
        amount: expense.amount,
        tone: 'out' as const,
      })),
  ];
  return byDateDesc(activity);
}

export type VegetableSaleLine = {
  saleId: string;
  date: number;
  vegetableId: string;
  name: string;
  quantity: number;
  unit: string;
  saleAmount: number;
};

export async function loadVegetableSaleLines(database: Database): Promise<VegetableSaleLine[]> {
  const [sales, items, vegetables] = await Promise.all([
    database.get<VegetableSale>('vegetable_sales').query(notDeleted()).fetch(),
    database.get<VegetableSaleItem>('vegetable_sale_items').query(notDeleted()).fetch(),
    database.get<VegetableMaster>('vegetable_masters').query().fetch(),
  ]);
  const saleDate = new Map(sales.map(sale => [sale.id, sale.date.getTime()]));
  const vegetableName = new Map(vegetables.map(row => [row.id, row.name]));
  return items
    .filter(item => saleDate.has(item.saleId))
    .map(item => ({
      saleId: item.saleId,
      date: saleDate.get(item.saleId) ?? 0,
      vegetableId: item.vegetableId,
      name: vegetableName.get(item.vegetableId) ?? 'भाजी',
      quantity: item.quantity,
      unit: item.unit,
      saleAmount: item.saleAmount,
    }));
}

export function balanceOf(
  entries: Array<{type: string; amount: number}>,
): number {
  return moneyNumber(balanceFromEntries(entries));
}

export {MILK_RATE_ITEM_ID};

function group<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const list = map.get(id);
    if (list) {
      list.push(row);
    } else {
      map.set(id, [row]);
    }
  }
  return map;
}
