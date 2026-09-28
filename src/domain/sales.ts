import Decimal from 'decimal.js';
import {lineAmount, money, moneyNumber} from './money';

function quantityValue(value: string, allowZero: boolean): Decimal | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const amount = new Decimal(normalized);
  if (amount.isNegative() || (!allowZero && amount.isZero())) {
    return null;
  }
  return amount;
}

/** Quantity sold = opening quantity − quantity still left. */
export function soldFromStock(opening: string, remaining: string): string | null {
  const open = quantityValue(opening, false);
  const left = quantityValue(remaining, true);
  if (open == null || left == null || left.greaterThan(open)) {
    return null;
  }
  const sold = open.minus(left);
  if (sold.lessThanOrEqualTo(0)) {
    return null;
  }
  return sold.toDecimalPlaces(3).toFixed(3);
}

/** Sale amount from quantity × selling price, in rupees. */
export function amountFromQuantity(quantity: string, rate: string): number | null {
  const qty = quantityValue(quantity, false);
  const price = quantityValue(rate, false);
  if (qty == null || price == null) {
    return null;
  }
  return moneyNumber(lineAmount(qty.toFixed(), price.toFixed()));
}

export type VegetableSaleInput = {
  vegetableId: string;
  quantity: number;
  unit: string;
  saleAmount: number;
  appliedRate: number;
  openingQuantity: number | null;
  remainingQuantity: number | null;
};

export type VegetableTotal = {
  name: string;
  unit: string;
  quantity: string;
  amount: string;
};

/** Adds quantity and amount for the same vegetable and unit. */
export function vegetableDayTotals(
  lines: Array<{name: string; unit: string; quantity: string; amount: string}>,
): VegetableTotal[] {
  const groups = new Map<string, {name: string; unit: string; quantity: Decimal; amount: Decimal}>();
  for (const line of lines) {
    const qty = quantityValue(line.quantity, false);
    const amount = quantityValue(line.amount, false);
    if (qty == null || amount == null || !line.name) {
      continue;
    }
    const key = `${line.name}\u0000${line.unit}`;
    const current = groups.get(key) ?? {
      name: line.name,
      unit: line.unit,
      quantity: new Decimal(0),
      amount: new Decimal(0),
    };
    current.quantity = current.quantity.plus(qty);
    current.amount = current.amount.plus(amount);
    groups.set(key, current);
  }
  return [...groups.values()].map(row => ({
    name: row.name,
    unit: row.unit,
    quantity: trimQuantity(row.quantity),
    amount: money(row.amount),
  }));
}

function trimQuantity(value: Decimal): string {
  return value.toDecimalPlaces(3).toFixed(3).replace(/\.?0+$/, '');
}
