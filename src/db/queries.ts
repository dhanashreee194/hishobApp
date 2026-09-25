import {Q} from '@nozbe/watermelondb';

export const financialTables = [
  'vegetable_sales',
  'vegetable_sale_items',
  'expenses',
  'customer_ledger_entries',
  'flour_transactions',
  'flour_items',
  'milk_entries',
  'partner_payments',
  'partner_settlements',
] as const;

export function notDeleted() {
  return Q.where('is_deleted', false);
}

export function onlyDeleted() {
  return Q.where('is_deleted', true);
}
