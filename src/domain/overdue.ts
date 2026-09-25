import {startOfDay} from './dates';
import {compareMoney, money, netAmount, sumAmounts} from './money';

export type OverdueEntry = {
  customerId: string;
  date: number;
  type: string;
  amount: string;
};

export type OverdueCustomer = {
  customerId: string;
  name: string;
  mobile: string;
  balance: string;
  oldestUnpaidDate: number;
  daysOverdue: number;
};

type Lot = {date: number; remaining: string};

/**
 * Oldest unpaid charge wins. Payments consume the oldest charge first.
 * A customer is due a reminder when that charge is at least `days` old and a balance remains.
 */
export function overdueCustomers(
  customers: Array<{id: string; name: string; mobile: string}>,
  entries: OverdueEntry[],
  days: number,
  today: Date,
): OverdueCustomer[] {
  const limit = Math.min(365, Math.max(1, Math.floor(days)));
  const todayStart = startOfDay(today).getTime();
  const byCustomer = new Map<string, OverdueEntry[]>();
  for (const entry of entries) {
    const list = byCustomer.get(entry.customerId) ?? [];
    list.push(entry);
    byCustomer.set(entry.customerId, list);
  }

  const due: OverdueCustomer[] = [];
  for (const customer of customers) {
    const lots = unpaidLots(byCustomer.get(customer.id) ?? []);
    const open = lots.filter(lot => compareMoney(lot.remaining, 0) > 0);
    if (open.length === 0) {
      continue;
    }
    const oldest = open[0].date;
    const daysOverdue = Math.floor((todayStart - startOfDay(new Date(oldest)).getTime()) / 86400000);
    if (daysOverdue < limit) {
      continue;
    }
    due.push({
      customerId: customer.id,
      name: customer.name,
      mobile: customer.mobile.trim(),
      balance: sumAmounts(open.map(lot => lot.remaining)),
      oldestUnpaidDate: oldest,
      daysOverdue,
    });
  }
  return due.sort((left, right) => right.daysOverdue - left.daysOverdue);
}

function unpaidLots(entries: OverdueEntry[]): Lot[] {
  const ordered = [...entries].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date - right.date;
    }
    if (left.type === right.type) {
      return 0;
    }
    return left.type === 'payment' ? 1 : -1;
  });
  const lots: Lot[] = [];
  for (const entry of ordered) {
    const amount = money(entry.amount);
    if (compareMoney(amount, 0) <= 0) {
      continue;
    }
    if (entry.type === 'payment') {
      let left = amount;
      for (const lot of lots) {
        if (compareMoney(left, 0) <= 0) {
          break;
        }
        if (compareMoney(lot.remaining, left) <= 0) {
          left = netAmount(left, lot.remaining);
          lot.remaining = '0.00';
        } else {
          lot.remaining = netAmount(lot.remaining, left);
          left = '0.00';
        }
      }
    } else {
      lots.push({date: entry.date, remaining: amount});
    }
  }
  return lots;
}
