import Decimal from 'decimal.js';

Decimal.set({precision: 40, rounding: Decimal.ROUND_HALF_UP});

export type MoneyInput = Decimal.Value;

function dec(value: MoneyInput): Decimal {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('रक्कम योग्य नाही');
    }
    return new Decimal(value.toString());
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
      throw new Error('रक्कम योग्य नाही');
    }
    return new Decimal(normalized);
  }
  return new Decimal(value);
}

/** Rupees rounded half-up to two decimal places, as an exact decimal string. */
export function money(value: MoneyInput): string {
  return dec(value).toDecimalPlaces(2).toFixed(2);
}

export function moneyNumber(value: MoneyInput): number {
  return Number(money(value));
}

export function compareMoney(left: MoneyInput, right: MoneyInput): number {
  return dec(money(left)).comparedTo(dec(money(right)));
}

/** amount = quantity × rate */
export function lineAmount(quantity: MoneyInput, rate: MoneyInput): string {
  return dec(quantity).mul(dec(rate)).toDecimalPlaces(2).toFixed(2);
}

/** net = sales − expenses */
export function netAmount(sales: MoneyInput, expenses: MoneyInput): string {
  return dec(sales).minus(dec(expenses)).toDecimalPlaces(2).toFixed(2);
}

export function sumAmounts(values: MoneyInput[]): string {
  const total = values.reduce<Decimal>(
    (sum, value) => sum.plus(dec(value)),
    new Decimal(0),
  );
  return total.toDecimalPlaces(2).toFixed(2);
}

export function businessNet(parts: {
  vegetableSales: MoneyInput;
  millIncome: MoneyInput;
  milkExpense: MoneyInput;
  otherExpenses: MoneyInput;
}): string {
  return dec(parts.vegetableSales)
    .plus(dec(parts.millIncome))
    .minus(dec(parts.milkExpense))
    .minus(dec(parts.otherExpenses))
    .toDecimalPlaces(2)
    .toFixed(2);
}

/** Partner Share = Shared Net × share % */
export function partnerShareAmount(sharedNet: MoneyInput, sharePercent: MoneyInput): string {
  return dec(sharedNet).mul(dec(sharePercent)).div(100).toDecimalPlaces(2).toFixed(2);
}

/** Owner Share = Shared Net − Partner Share */
export function ownerShareAmount(sharedNet: MoneyInput, partnerShare: MoneyInput): string {
  return dec(sharedNet).minus(dec(partnerShare)).toDecimalPlaces(2).toFixed(2);
}

/** Remaining Payable = Partner Share − Partner Payments Recorded */
export function remainingPayableAmount(partnerShare: MoneyInput, payments: MoneyInput): string {
  return dec(partnerShare).minus(dec(payments)).toDecimalPlaces(2).toFixed(2);
}

export type BalanceMovement = {
  type: string;
  amount: MoneyInput;
};

/** Chronological running balance. Payments reduce it; every other type is a charge. */
export function runningBalances(entries: BalanceMovement[]): string[] {
  let running = new Decimal(0);
  return entries.map(entry => {
    const amount = dec(entry.amount);
    running = entry.type === 'payment' ? running.minus(amount) : running.plus(amount);
    return running.toDecimalPlaces(2).toFixed(2);
  });
}

export function balanceFromEntries(entries: BalanceMovement[]): string {
  const rows = runningBalances(entries);
  return rows.length === 0 ? '0.00' : rows[rows.length - 1];
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return moneyNumber(value);
}

export function parseNumber(value: string | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

export function multiplyMoney(quantity: number, rate: number): number {
  return Number(lineAmount(quantity, rate));
}

export function sumMoney(values: number[]): number {
  return Number(sumAmounts(values));
}

export function paymentStanding(
  total: number,
  paid: number,
): 'paid' | 'partial' | 'pending' {
  if (compareMoney(paid, 0) <= 0) {
    return 'pending';
  }
  if (compareMoney(paid, total) >= 0) {
    return 'paid';
  }
  return 'partial';
}

export class LedgerError extends Error {}
