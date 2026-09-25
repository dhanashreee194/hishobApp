import {Database, Model, Q} from '@nozbe/watermelondb';
import {FinancialModel} from './stampModels';
import {onlyDeleted} from './queries';

const deletable = new Set([
  'vegetable_sales',
  'expenses',
  'customer_ledger_entries',
  'flour_transactions',
  'milk_entries',
  'partner_payments',
  'partner_settlements',
  'stock_movements',
  'product_moves',
  'business_expenses',
]);

const children: Record<string, {table: string; column: string}> = {
  vegetable_sales: {table: 'vegetable_sale_items', column: 'sale_id'},
  flour_transactions: {table: 'flour_items', column: 'transaction_id'},
};

const deletedSources: Array<{
  table: string;
  title: string;
  dateKey: string;
  amountKey: string | null;
  detailKey: string | null;
}> = [
  {table: 'vegetable_sales', title: 'भाजी विक्री', dateKey: 'date', amountKey: 'total_amount', detailKey: 'notes'},
  {table: 'expenses', title: 'खर्च', dateKey: 'date', amountKey: 'amount', detailKey: 'notes'},
  {table: 'customer_ledger_entries', title: 'उधारी', dateKey: 'date', amountKey: 'amount', detailKey: 'notes'},
  {table: 'flour_transactions', title: 'गिरणी', dateKey: 'date', amountKey: 'total_amount', detailKey: 'notes'},
  {table: 'milk_entries', title: 'दूध', dateKey: 'date', amountKey: 'amount', detailKey: 'supplier_id_or_name'},
  {table: 'partner_payments', title: 'भागीदार पेमेंट', dateKey: 'date', amountKey: 'amount', detailKey: 'notes'},
  {table: 'partner_settlements', title: 'भागीदारी हिशोब', dateKey: 'created_at', amountKey: 'remaining', detailKey: 'period'},
  {table: 'stock_movements', title: 'साठा', dateKey: 'date', amountKey: null, detailKey: 'notes'},
  {table: 'product_moves', title: 'धंदा नोंद', dateKey: 'date', amountKey: 'amount', detailKey: 'notes'},
  {table: 'business_expenses', title: 'धंदा खर्च', dateKey: 'date', amountKey: 'amount', detailKey: 'notes'},
];

export type DeletedRecord = {
  id: string;
  table: string;
  title: string;
  subtitle: string;
  amount: number | null;
  date: number;
};

export async function softDeleteRecord(
  database: Database,
  table: string,
  id: string,
): Promise<void> {
  await setDeleted(database, table, id, true);
}

export async function restoreRecord(
  database: Database,
  table: string,
  id: string,
): Promise<void> {
  await setDeleted(database, table, id, false);
}

export async function loadDeletedRecords(database: Database): Promise<DeletedRecord[]> {
  const lists = await Promise.all(
    deletedSources.map(async source => {
      const rows = await database.get(source.table).query(onlyDeleted()).fetch();
      return rows.map(row => {
        const raw = row._raw as {[key: string]: unknown};
        const detail = source.detailKey ? textOf(raw[source.detailKey]) : '';
        const authorName = textOf(raw.created_by);
        const author = !authorName || authorName === 'owner' ? 'मालक' : authorName;
        return {
          id: row.id,
          table: source.table,
          title: source.title,
          subtitle: [detail, `नोंदवले: ${author}`].filter(Boolean).join(' · '),
          amount: source.amountKey && raw[source.amountKey] != null ? Number(raw[source.amountKey]) : null,
          date: Number(raw[source.dateKey] ?? raw.created_at ?? 0),
        };
      });
    }),
  );
  return lists.flat().sort((left, right) => right.date - left.date);
}

async function setDeleted(
  database: Database,
  table: string,
  id: string,
  deleted: boolean,
): Promise<void> {
  if (!deletable.has(table)) {
    throw new Error('ही नोंद काढता येत नाही');
  }
  const row = await database.get(table).find(id);
  const related = await relatedRows(database, table, id);
  await database.write(async () => {
    await database.batch(mark(row, deleted), ...related.map(item => mark(item, deleted)));
  });
}

async function relatedRows(database: Database, table: string, id: string): Promise<Model[]> {
  const rows: Model[] = [];
  const child = children[table];
  if (child) {
    rows.push(...(await database.get(child.table).query(Q.where(child.column, id)).fetch()));
  }
  if (table === 'flour_transactions' || table === 'product_moves') {
    rows.push(
      ...(await database
        .get('customer_ledger_entries')
        .query(Q.where('reference_id', id))
        .fetch()),
    );
  }
  return rows;
}

function mark(record: Model, deleted: boolean) {
  return record.prepareUpdate(next => {
    (next as FinancialModel).isDeleted = deleted;
  });
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
