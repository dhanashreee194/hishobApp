import Decimal from 'decimal.js';
import {netAmount, partnerShareAmount} from './money';

export type TrackingMode = 'resale' | 'manufacture' | 'service' | 'household';
export type MoveDirection = 'buy' | 'produce' | 'sell';

export type TrackingFlags = {
  buys: boolean;
  produces: boolean;
  sells: boolean;
  tracksCredit: boolean;
  tracksBilling: boolean;
};

export function trackingFlags(mode: TrackingMode): TrackingFlags {
  if (mode === 'manufacture') {
    return {buys: true, produces: true, sells: true, tracksCredit: true, tracksBilling: true};
  }
  if (mode === 'service') {
    return {buys: false, produces: false, sells: true, tracksCredit: true, tracksBilling: true};
  }
  if (mode === 'household') {
    return {buys: true, produces: false, sells: false, tracksCredit: false, tracksBilling: false};
  }
  return {buys: true, produces: false, sells: true, tracksCredit: true, tracksBilling: true};
}

export function asTrackingMode(value: string): TrackingMode {
  if (value === 'manufacture' || value === 'service' || value === 'household' || value === 'resale') {
    return value;
  }
  return 'resale';
}

export type BulkMove = {
  productId: string;
  direction: MoveDirection;
  quantity: string;
};

export type BulkPosition = {
  productId: string;
  bought: string;
  produced: string;
  sold: string;
  onHand: string;
};

function places(value: Decimal): string {
  return value.toDecimalPlaces(3).toFixed(3);
}

export function bulkPositions(moves: BulkMove[]): BulkPosition[] {
  const totals = new Map<string, {bought: Decimal; produced: Decimal; sold: Decimal}>();
  for (const move of moves) {
    const row = totals.get(move.productId) ?? {
      bought: new Decimal(0),
      produced: new Decimal(0),
      sold: new Decimal(0),
    };
    const qty = new Decimal(move.quantity);
    if (move.direction === 'buy') {
      row.bought = row.bought.plus(qty);
    } else if (move.direction === 'produce') {
      row.produced = row.produced.plus(qty);
    } else {
      row.sold = row.sold.plus(qty);
    }
    totals.set(move.productId, row);
  }
  return [...totals.entries()]
    .map(([productId, row]) => ({
      productId,
      bought: places(row.bought),
      produced: places(row.produced),
      sold: places(row.sold),
      onHand: places(row.bought.plus(row.produced).minus(row.sold)),
    }))
    .sort((left, right) => left.productId.localeCompare(right.productId));
}

export function scopedPartnerShare(input: {
  sales: string;
  expenses: string;
  sharePercent: string;
}): {sharedNet: string; partnerShare: string} {
  const sharedNet = netAmount(input.sales, input.expenses);
  return {sharedNet, partnerShare: partnerShareAmount(sharedNet, input.sharePercent)};
}

export type CollaboratorView = {
  phone: string;
  businessId: string;
  productId: string | null;
  active: boolean;
};

export type ViewerAccess = {
  viewOnly: boolean;
  businessIds: string[] | null;
  productIds: (businessId: string) => string[] | null;
};

export function viewerAccess(
  role: 'owner' | 'assistant',
  phone: string | null,
  collaborators: CollaboratorView[],
): ViewerAccess {
  const viewOnly = role === 'assistant';
  const open: ViewerAccess = {viewOnly, businessIds: null, productIds: () => null};
  if (!viewOnly || !phone) {
    return open;
  }
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length < 10) {
    return open;
  }
  const mine = collaborators.filter(
    row => row.active && row.phone.replace(/\D/g, '').slice(-10) === digits,
  );
  if (mine.length === 0) {
    return open;
  }
  const products = new Map<string, Set<string> | null>();
  for (const row of mine) {
    if (!row.productId) {
      products.set(row.businessId, null);
      continue;
    }
    if (products.get(row.businessId) === null) {
      continue;
    }
    const set = products.get(row.businessId) ?? new Set<string>();
    set.add(row.productId);
    products.set(row.businessId, set);
  }
  return {
    viewOnly,
    businessIds: [...products.keys()],
    productIds: businessId => {
      const value = products.get(businessId);
      return value == null ? null : [...value];
    },
  };
}
