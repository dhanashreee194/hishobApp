import {endOfDay, startOfDay} from './dates';
import {formatIndianDate} from '../theme/format';
import {
  compareMoney,
  money,
  netAmount,
  sumAmounts,
  type MoneyInput,
} from './money';
import {settlePartner} from './settlement';

export type PeriodKind = 'day' | 'month' | 'year' | 'progressive';

export type DatedAmount = {
  date: number;
  amount: string;
};

export type ProductSale = DatedAmount & {
  productId: string;
  businessType: string;
};

export type PartnerScope = {
  businessType: string;
  sharePercent: string;
  active: boolean;
  productIds: string[];
};

export type FlourPoint = {
  date: number;
  total: string;
  paid: string;
  pending: string;
};

export type LedgerPoint = {
  date: number;
  type: string;
  amount: string;
};

export type ReportRow = {
  key: string;
  label: string;
  cells: string[];
  chartExact: string;
};

export type BuiltReport = {
  headers: string[];
  rows: ReportRow[];
  periodLabel: string;
};

type Bucket = {
  key: string;
  label: string;
  start: number;
  end: number;
};

const MONTHS = [
  'जाने',
  'फेब्रु',
  'मार्च',
  'एप्रि',
  'मे',
  'जून',
  'जुलै',
  'ऑग',
  'सप्टें',
  'ऑक्टो',
  'नोव्हें',
  'डिसें',
];

function dayStamp(timestamp: number): number {
  return startOfDay(new Date(timestamp)).getTime();
}

function cutoff(anchor: Date): number {
  return endOfDay(anchor).getTime();
}

function bucketsFor(
  kind: Exclude<PeriodKind, 'progressive'>,
  anchor: Date,
  years: number[],
): Bucket[] {
  if (kind === 'day') {
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const last = new Date(year, month + 1, 0).getDate();
    return Array.from({length: last}, (_, index) => {
      const day = new Date(year, month, index + 1);
      return {
        key: `${year}-${month}-${index + 1}`,
        label: String(index + 1),
        start: startOfDay(day).getTime(),
        end: endOfDay(day).getTime(),
      };
    });
  }
  if (kind === 'month') {
    const year = anchor.getFullYear();
    return MONTHS.map((label, index) => {
      const start = new Date(year, index, 1);
      const end = new Date(year, index + 1, 0);
      return {
        key: `${year}-${index}`,
        label,
        start: startOfDay(start).getTime(),
        end: endOfDay(end).getTime(),
      };
    });
  }
  const unique = [...new Set([...years, anchor.getFullYear()])].sort((left, right) => left - right);
  return unique.map(year => ({
    key: String(year),
    label: String(year),
    start: startOfDay(new Date(year, 0, 1)).getTime(),
    end: endOfDay(new Date(year, 11, 31)).getTime(),
  }));
}

function periodLabel(kind: PeriodKind, anchor: Date, rows: ReportRow[]): string {
  if (kind === 'progressive') {
    return `${formatIndianDate(anchor)} पर्यंत एकत्रित`;
  }
  if (kind === 'day') {
    return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }
  if (kind === 'month') {
    return `${anchor.getFullYear()}`;
  }
  if (rows.length <= 1) {
    return String(anchor.getFullYear());
  }
  return `${rows[0].label}–${rows[rows.length - 1].label}`;
}

function activityDays(dates: number[], anchor: Date): number[] {
  const limit = cutoff(anchor);
  return [...new Set(dates.filter(date => date <= limit).map(dayStamp))].sort(
    (left, right) => left - right,
  );
}

function inBucket(date: number, bucket: Bucket): boolean {
  return date >= bucket.start && date <= bucket.end;
}

function sumDated(rows: DatedAmount[], bucket?: Bucket): string {
  const chosen = bucket ? rows.filter(row => inBucket(row.date, bucket)) : rows;
  return sumAmounts(chosen.map(row => row.amount));
}

export function buildFlourReport(
  rows: FlourPoint[],
  kind: PeriodKind,
  anchor: Date,
): BuiltReport {
  const scoped = rows.filter(row => row.date <= cutoff(anchor));
  if (kind === 'progressive') {
    const days = activityDays(scoped.map(row => row.date), anchor);
    let running = '0.00';
    const table = days.map(day => {
      const dayRows = scoped.filter(row => dayStamp(row.date) === day);
      const total = sumAmounts(dayRows.map(row => row.total));
      const paid = sumAmounts(dayRows.map(row => row.paid));
      const pending = sumAmounts(dayRows.map(row => row.pending));
      running = sumAmounts([running, total]);
      return {
        key: String(day),
        label: formatIndianDate(new Date(day)),
        cells: [total, paid, pending, running],
        chartExact: running,
      };
    });
    return {
      headers: ['उत्पन्न', 'भरले', 'बाकी', 'एकत्रित'],
      rows: table,
      periodLabel: periodLabel(kind, anchor, table),
    };
  }
  const years = scoped.map(row => new Date(row.date).getFullYear());
  const table = bucketsFor(kind, anchor, years).map(bucket => {
    const inside = scoped.filter(row => inBucket(row.date, bucket));
    const total = sumAmounts(inside.map(row => row.total));
    const paid = sumAmounts(inside.map(row => row.paid));
    const pending = sumAmounts(inside.map(row => row.pending));
    return {
      key: bucket.key,
      label: bucket.label,
      cells: [total, paid, pending],
      chartExact: total,
    };
  });
  return {
    headers: ['उत्पन्न', 'भरले', 'बाकी'],
    rows: table,
    periodLabel: periodLabel(kind, anchor, table),
  };
}

export function buildDairyReport(
  rows: Array<DatedAmount & {litres: string}>,
  kind: PeriodKind,
  anchor: Date,
): BuiltReport {
  const scoped = rows.filter(row => row.date <= cutoff(anchor));
  if (kind === 'progressive') {
    const days = activityDays(scoped.map(row => row.date), anchor);
    let running = '0.00';
    const table = days.map(day => {
      const dayRows = scoped.filter(row => dayStamp(row.date) === day);
      const litres = sumAmounts(dayRows.map(row => row.litres));
      const amount = sumAmounts(dayRows.map(row => row.amount));
      running = sumAmounts([running, amount]);
      return {
        key: String(day),
        label: formatIndianDate(new Date(day)),
        cells: [litres, amount, running],
        chartExact: running,
      };
    });
    return {
      headers: ['लिटर', 'रक्कम', 'एकत्रित'],
      rows: table,
      periodLabel: periodLabel(kind, anchor, table),
    };
  }
  const years = scoped.map(row => new Date(row.date).getFullYear());
  const table = bucketsFor(kind, anchor, years).map(bucket => {
    const inside = scoped.filter(row => inBucket(row.date, bucket));
    const litres = sumAmounts(inside.map(row => row.litres));
    const amount = sumAmounts(inside.map(row => row.amount));
    return {
      key: bucket.key,
      label: bucket.label,
      cells: [litres, amount],
      chartExact: amount,
    };
  });
  return {
    headers: ['लिटर', 'रक्कम'],
    rows: table,
    periodLabel: periodLabel(kind, anchor, table),
  };
}

export function buildVegetableReport(
  sales: DatedAmount[],
  expenses: DatedAmount[],
  kind: PeriodKind,
  anchor: Date,
): BuiltReport {
  const scopedSales = sales.filter(row => row.date <= cutoff(anchor));
  const scopedExpenses = expenses.filter(row => row.date <= cutoff(anchor));
  if (kind === 'progressive') {
    const days = activityDays(
      [...scopedSales, ...scopedExpenses].map(row => row.date),
      anchor,
    );
    let salesRunning = '0.00';
    let expenseRunning = '0.00';
    const table = days.map(day => {
      const daySales = sumDated(scopedSales.filter(row => dayStamp(row.date) === day));
      const dayExpenses = sumDated(scopedExpenses.filter(row => dayStamp(row.date) === day));
      salesRunning = sumAmounts([salesRunning, daySales]);
      expenseRunning = sumAmounts([expenseRunning, dayExpenses]);
      const net = netAmount(salesRunning, expenseRunning);
      return {
        key: String(day),
        label: formatIndianDate(new Date(day)),
        cells: [salesRunning, expenseRunning, net],
        chartExact: net,
      };
    });
    return {
      headers: ['विक्री', 'खर्च', 'एकत्रित निव्वळ'],
      rows: table,
      periodLabel: periodLabel(kind, anchor, table),
    };
  }
  const years = [...scopedSales, ...scopedExpenses].map(row => new Date(row.date).getFullYear());
  const table = bucketsFor(kind, anchor, years).map(bucket => {
    const saleTotal = sumDated(scopedSales, bucket);
    const expenseTotal = sumDated(scopedExpenses, bucket);
    const net = netAmount(saleTotal, expenseTotal);
    return {
      key: bucket.key,
      label: bucket.label,
      cells: [saleTotal, expenseTotal, net],
      chartExact: net,
    };
  });
  return {
    headers: ['विक्री', 'खर्च', 'निव्वळ'],
    rows: table,
    periodLabel: periodLabel(kind, anchor, table),
  };
}

function moveBalance(running: string, entry: LedgerPoint): string {
  return entry.type === 'payment'
    ? netAmount(running, entry.amount)
    : sumAmounts([running, entry.amount]);
}

export function buildUdhariReport(
  entries: LedgerPoint[],
  kind: PeriodKind,
  anchor: Date,
): BuiltReport {
  const scoped = [...entries]
    .filter(entry => entry.date <= cutoff(anchor))
    .sort((left, right) => left.date - right.date);
  if (kind === 'progressive') {
    const days = activityDays(scoped.map(entry => entry.date), anchor);
    let running = '0.00';
    const table = days.map(day => {
      const dayEntries = scoped.filter(entry => dayStamp(entry.date) === day);
      let charges = '0.00';
      let payments = '0.00';
      for (const entry of dayEntries) {
        if (entry.type === 'payment') {
          payments = sumAmounts([payments, entry.amount]);
        } else {
          charges = sumAmounts([charges, entry.amount]);
        }
        running = moveBalance(running, entry);
      }
      return {
        key: String(day),
        label: formatIndianDate(new Date(day)),
        cells: [charges, payments, running],
        chartExact: running,
      };
    });
    return {
      headers: ['उधार', 'जमा', 'शिल्लक'],
      rows: table,
      periodLabel: periodLabel(kind, anchor, table),
    };
  }
  const years = scoped.map(entry => new Date(entry.date).getFullYear());
  const buckets = bucketsFor(kind, anchor, years);
  let cursor = 0;
  let running = '0.00';
  const table = buckets.map(bucket => {
    let charges = '0.00';
    let payments = '0.00';
    while (cursor < scoped.length && scoped[cursor].date < bucket.start) {
      running = moveBalance(running, scoped[cursor]);
      cursor += 1;
    }
    while (cursor < scoped.length && scoped[cursor].date <= bucket.end) {
      const entry = scoped[cursor];
      if (entry.type === 'payment') {
        payments = sumAmounts([payments, entry.amount]);
      } else {
        charges = sumAmounts([charges, entry.amount]);
      }
      running = moveBalance(running, entry);
      cursor += 1;
    }
    return {
      key: bucket.key,
      label: bucket.label,
      cells: [charges, payments, running],
      chartExact: running,
    };
  });
  return {
    headers: ['उधार', 'जमा', 'शिल्लक'],
    rows: table,
    periodLabel: periodLabel(kind, anchor, table),
  };
}

/**
 * A partner counts in one business. Chosen products limit the share to those
 * lines. With no products, vegetables use shared sales and that business's
 * shared expenses; mill, milk, and other use only that business's shared expenses.
 */
export function scopePartnerBooks(
  businessType: string,
  sales: DatedAmount[],
  expenses: Array<DatedAmount & {businessType: string}>,
  productIds: string[] = [],
  productSales: ProductSale[] = [],
): {sales: DatedAmount[]; expenses: DatedAmount[]} {
  if (productIds.length > 0) {
    const chosen = new Set(productIds);
    return {
      sales: productSales.filter(
        row => row.businessType === businessType && chosen.has(row.productId),
      ),
      expenses: [],
    };
  }
  return {
    sales: businessType === 'vegetable' ? sales : [],
    expenses: expenses.filter(row => row.businessType === businessType),
  };
}

/** Shares add up only inside one business, and only on the products they cover. */
export function overloadedScopes(
  partners: PartnerScope[],
): Array<{businessType: string; productId: string | null; total: string}> {
  const active = partners.filter(row => row.active);
  const hits: Array<{businessType: string; productId: string | null; total: string}> = [];
  for (const businessType of [...new Set(active.map(row => row.businessType))]) {
    const group = active.filter(row => row.businessType === businessType);
    const whole = group.filter(row => row.productIds.length === 0);
    const wholeTotal = sumAmounts(whole.map(row => row.sharePercent));
    if (whole.length > 0 && compareMoney(wholeTotal, 100) > 0) {
      hits.push({businessType, productId: null, total: wholeTotal});
    }
    for (const productId of [...new Set(group.flatMap(row => row.productIds))]) {
      const covering = group.filter(
        row => row.productIds.length === 0 || row.productIds.includes(productId),
      );
      const total = sumAmounts(covering.map(row => row.sharePercent));
      if (compareMoney(total, 100) > 0) {
        hits.push({businessType, productId, total});
      }
    }
  }
  return hits;
}

export function buildPartnerReport(
  input: {
    sales: DatedAmount[];
    expenses: DatedAmount[];
    payments: DatedAmount[];
    sharePercent: MoneyInput;
  },
  kind: PeriodKind,
  anchor: Date,
): BuiltReport {
  const limit = cutoff(anchor);
  const sales = input.sales.filter(row => row.date <= limit);
  const expenses = input.expenses.filter(row => row.date <= limit);
  const payments = input.payments.filter(row => row.date <= limit);
  const share = input.sharePercent;
  if (kind === 'progressive') {
    const days = activityDays(
      [...sales, ...expenses, ...payments].map(row => row.date),
      anchor,
    );
    let salesRunning = '0.00';
    let expenseRunning = '0.00';
    let paidRunning = '0.00';
    const table = days.map(day => {
      salesRunning = sumAmounts([
        salesRunning,
        sumDated(sales.filter(row => dayStamp(row.date) === day)),
      ]);
      expenseRunning = sumAmounts([
        expenseRunning,
        sumDated(expenses.filter(row => dayStamp(row.date) === day)),
      ]);
      paidRunning = sumAmounts([
        paidRunning,
        sumDated(payments.filter(row => dayStamp(row.date) === day)),
      ]);
      const settled = settlePartner({
        sharedSales: salesRunning,
        sharedExpenses: expenseRunning,
        sharePercent: share,
        partnerPayments: paidRunning,
      });
      return {
        key: String(day),
        label: formatIndianDate(new Date(day)),
        cells: [
          settled.sharedNet,
          settled.partnerShare,
          settled.ownerShare,
          settled.partnerPayments,
          settled.remainingPayable,
        ],
        chartExact: settled.remainingPayable,
      };
    });
    return {
      headers: ['निव्वळ', 'भागीदार', 'मालक', 'दिलेले', 'देय'],
      rows: table,
      periodLabel: periodLabel(kind, anchor, table),
    };
  }
  const years = [...sales, ...expenses, ...payments].map(row => new Date(row.date).getFullYear());
  const table = bucketsFor(kind, anchor, years).map(bucket => {
    const settled = settlePartner({
      sharedSales: sumDated(sales, bucket),
      sharedExpenses: sumDated(expenses, bucket),
      sharePercent: share,
      partnerPayments: sumDated(payments, bucket),
    });
    return {
      key: bucket.key,
      label: bucket.label,
      cells: [
        settled.sharedNet,
        settled.partnerShare,
        settled.ownerShare,
        settled.partnerPayments,
        settled.remainingPayable,
      ],
      chartExact: settled.remainingPayable,
    };
  });
  return {
    headers: ['निव्वळ', 'भागीदार', 'मालक', 'दिलेले', 'देय'],
    rows: table,
    periodLabel: periodLabel(kind, anchor, table),
  };
}

export function reportHasMovement(report: BuiltReport): boolean {
  return report.rows.some(
    row =>
      !isZero(row.chartExact) || row.cells.some(cell => !isZero(cell)),
  );
}

function isZero(value: string): boolean {
  return money(value) === '0.00' || money(value) === '-0.00';
}

export function settlementWindow(kind: PeriodKind, anchor: Date): {from: number; to: number} {
  if (kind === 'progressive') {
    return {from: 0, to: cutoff(anchor)};
  }
  if (kind === 'day') {
    return {from: startOfDay(anchor).getTime(), to: endOfDay(anchor).getTime()};
  }
  if (kind === 'month') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return {from: startOfDay(start).getTime(), to: endOfDay(end).getTime()};
  }
  const start = new Date(anchor.getFullYear(), 0, 1);
  const end = new Date(anchor.getFullYear(), 11, 31);
  return {from: startOfDay(start).getTime(), to: endOfDay(end).getTime()};
}
