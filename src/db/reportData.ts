import {Database} from '@nozbe/watermelondb';
import {notDeleted} from './queries';
import {startOfDay} from '../domain/dates';
import type {DatedAmount, FlourPoint, LedgerPoint, PeriodKind} from '../domain/reports';
import {settlementWindow, scopePartnerBooks} from '../domain/reports';
import {settlePartner, type SettlementResult} from '../domain/settlement';
import {money, sumAmounts} from '../domain/money';
import type {SearchIndex} from '../domain/search';
import {
  Customer,
  CustomerLedgerEntry,
  Expense,
  ExpenseCategory,
  FlourItem,
  FlourTransaction,
  GrainMaster,
  MilkEntry,
  Partner,
  PartnerPayment,
  VegetableMaster,
  VegetableSale,
  VegetableSaleItem,
} from './models';

export type PartnerRow = {
  id: string;
  name: string;
  sharePercent: string;
  businessType: string;
  active: boolean;
};

export type PartnerPaymentRow = {
  id: string;
  partnerId: string;
  date: number;
  amount: string;
  notes: string;
};

export type ReportSource = {
  flour: FlourPoint[];
  milk: Array<DatedAmount & {litres: string}>;
  vegetableSales: DatedAmount[];
  vegetableExpenses: DatedAmount[];
  sharedSales: DatedAmount[];
  sharedExpenses: Array<DatedAmount & {businessType: string}>;
  ledger: LedgerPoint[];
  partners: PartnerRow[];
  payments: PartnerPaymentRow[];
};

function stamp(date: Date): number {
  return startOfDay(date).getTime();
}

export async function loadReportSource(database: Database): Promise<ReportSource> {
  const [flour, milk, sales, expenses, ledger, partners, payments] = await Promise.all([
    database.get<FlourTransaction>('flour_transactions').query(notDeleted()).fetch(),
    database.get<MilkEntry>('milk_entries').query(notDeleted()).fetch(),
    database.get<VegetableSale>('vegetable_sales').query(notDeleted()).fetch(),
    database.get<Expense>('expenses').query(notDeleted()).fetch(),
    database.get<CustomerLedgerEntry>('customer_ledger_entries').query(notDeleted()).fetch(),
    database.get<Partner>('partners').query().fetch(),
    database.get<PartnerPayment>('partner_payments').query(notDeleted()).fetch(),
  ]);
  return {
    flour: flour.map(row => ({
      date: stamp(row.date),
      total: money(row.totalAmount),
      paid: money(row.paidAmount),
      pending: money(row.pendingAmount),
    })),
    milk: milk.map(row => ({
      date: stamp(row.date),
      amount: money(row.amount),
      litres: money(row.quantityLitres),
    })),
    vegetableSales: sales.map(row => ({
      date: stamp(row.date),
      amount: money(row.totalAmount),
    })),
    vegetableExpenses: expenses
      .filter(row => row.businessType === 'vegetable')
      .map(row => ({
        date: stamp(row.date),
        amount: money(row.amount),
      })),
    sharedSales: sales
      .filter(row => row.ownershipType === 'shared')
      .map(row => ({
        date: stamp(row.date),
        amount: money(row.totalAmount),
      })),
    sharedExpenses: expenses
      .filter(row => row.allocationType === 'shared')
      .map(row => ({
        date: stamp(row.date),
        amount: money(row.amount),
        businessType: row.businessType,
      })),
    ledger: ledger.map(row => ({
      date: stamp(row.date),
      type: row.type,
      amount: money(row.amount),
    })),
    partners: partners
      .map(row => ({
        id: row.id,
        name: row.name,
        sharePercent: money(row.sharePercent),
        businessType: row.businessType || 'vegetable',
        active: row.active,
      }))
      .sort((left, right) => left.name.localeCompare(right.name, 'mr')),
    payments: payments.map(row => ({
      id: row.id,
      partnerId: row.partnerId,
      date: stamp(row.date),
      amount: money(row.amount),
      notes: row.notes ?? '',
    })),
  };
}

export async function loadPartnerSettlement(
  database: Database,
  partnerId: string,
  kind: PeriodKind,
  anchor: Date,
): Promise<SettlementResult & {payments: PartnerPaymentRow[]; sharePercent: string}> {
  const source = await loadReportSource(database);
  const partner = source.partners.find(row => row.id === partnerId);
  const sharePercent = partner?.sharePercent ?? '0.00';
  const businessType = partner?.businessType ?? 'vegetable';
  const window = settlementWindow(kind, anchor);
  const inWindow = (date: number) => date >= window.from && date <= window.to;
  const payments = source.payments.filter(
    row => row.partnerId === partnerId && inWindow(row.date),
  );
  const books = scopePartnerBooks(businessType, source.sharedSales, source.sharedExpenses);
  const settled = settlePartner({
    sharedSales: sumAmounts(books.sales.filter(row => inWindow(row.date)).map(row => row.amount)),
    sharedExpenses: sumAmounts(
      books.expenses.filter(row => inWindow(row.date)).map(row => row.amount),
    ),
    sharePercent,
    partnerPayments: sumAmounts(payments.map(row => row.amount)),
  });
  return {...settled, payments, sharePercent};
}

export async function loadSearchIndex(database: Database): Promise<SearchIndex> {
  const [customers, ledger, flour, flourItems, grains, milk, sales, saleItems, vegetables, expenses, categories] =
    await Promise.all([
      database.get<Customer>('customers').query().fetch(),
      database.get<CustomerLedgerEntry>('customer_ledger_entries').query(notDeleted()).fetch(),
      database.get<FlourTransaction>('flour_transactions').query(notDeleted()).fetch(),
      database.get<FlourItem>('flour_items').query(notDeleted()).fetch(),
      database.get<GrainMaster>('grain_masters').query().fetch(),
      database.get<MilkEntry>('milk_entries').query(notDeleted()).fetch(),
      database.get<VegetableSale>('vegetable_sales').query(notDeleted()).fetch(),
      database.get<VegetableSaleItem>('vegetable_sale_items').query(notDeleted()).fetch(),
      database.get<VegetableMaster>('vegetable_masters').query().fetch(),
      database.get<Expense>('expenses').query(notDeleted()).fetch(),
      database.get<ExpenseCategory>('expense_categories').query().fetch(),
    ]);
  const grainName = new Map(grains.map(row => [row.id, row.name]));
  const customerName = new Map(customers.map(row => [row.id, row.name]));
  const vegetableName = new Map(vegetables.map(row => [row.id, row.name]));
  const itemsByFlour = new Map<string, FlourItem[]>();
  for (const item of flourItems) {
    const list = itemsByFlour.get(item.transactionId) ?? [];
    list.push(item);
    itemsByFlour.set(item.transactionId, list);
  }
  const itemsBySale = new Map<string, VegetableSaleItem[]>();
  for (const item of saleItems) {
    const list = itemsBySale.get(item.saleId) ?? [];
    list.push(item);
    itemsBySale.set(item.saleId, list);
  }
  const datesByCustomer = new Map<string, number[]>();
  for (const entry of ledger) {
    const list = datesByCustomer.get(entry.customerId) ?? [];
    list.push(stamp(entry.date));
    datesByCustomer.set(entry.customerId, list);
  }
  const categoryName = new Map(categories.map(row => [row.id, row.name]));
  return {
    customers: customers.map(row => ({
      name: row.name,
      mobile: row.mobile ?? '',
      entryDates: datesByCustomer.get(row.id) ?? [],
    })),
    flour: flour.map(row => ({
      date: stamp(row.date),
      customerName: row.customerId ? (customerName.get(row.customerId) ?? null) : null,
      grainName: (itemsByFlour.get(row.id) ?? [])
        .map(item => grainName.get(item.grainId) ?? '')
        .join(', '),
    })),
    milk: milk.map(row => ({date: stamp(row.date)})),
    vegetables: [
      ...sales.map(row => ({
        date: stamp(row.date),
        title: row.ownershipType === 'shared' ? 'सामाईक विक्री' : 'स्वतःची विक्री',
        subtitle: (itemsBySale.get(row.id) ?? [])
          .map(item => vegetableName.get(item.vegetableId) ?? '')
          .join(', '),
      })),
      ...expenses
        .filter(row => row.businessType === 'vegetable')
        .map(row => ({
          date: stamp(row.date),
          title: row.categoryId ? (categoryName.get(row.categoryId) ?? 'खर्च') : 'खर्च',
          subtitle: row.notes ?? 'भाजी खर्च',
        })),
    ],
  };
}
