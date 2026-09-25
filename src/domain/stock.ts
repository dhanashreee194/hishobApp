import Decimal from 'decimal.js';

export type StockKind = 'grain' | 'flour';
export type StockDirection = 'in' | 'out';

export type StockMove = {
  grainId: string;
  kind: StockKind;
  direction: StockDirection;
  quantity: string;
};

export type StockBalance = {
  grainId: string;
  kind: StockKind;
  quantity: string;
};

export function quantity(value: string): string {
  const normalized = value.replace(/,/g, '').trim();
  if (!/^\d+(\.\d+)?$/.test(normalized) || Number(normalized) <= 0) {
    throw new Error('प्रमाण योग्य नाही');
  }
  return new Decimal(normalized).toDecimalPlaces(3).toFixed(3);
}

export function stockBalances(moves: StockMove[]): StockBalance[] {
  const totals = new Map<string, Decimal>();
  for (const move of moves) {
    const key = `${move.kind}:${move.grainId}`;
    const current = totals.get(key) ?? new Decimal(0);
    const amount = new Decimal(quantity(move.quantity));
    totals.set(key, move.direction === 'out' ? current.minus(amount) : current.plus(amount));
  }
  return [...totals.entries()]
    .map(([key, total]) => {
      const [kind, grainId] = key.split(':') as [StockKind, string];
      return {grainId, kind, quantity: total.toDecimalPlaces(3).toFixed(3)};
    })
    .sort((left, right) => {
      const byKind = left.kind.localeCompare(right.kind);
      return byKind === 0 ? left.grainId.localeCompare(right.grainId) : byKind;
    });
}
