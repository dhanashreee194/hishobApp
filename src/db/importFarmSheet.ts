import {Database} from '@nozbe/watermelondb';
import {roundMoney} from '../domain/money';
import {farmSheet} from './farmSheet';
import {Expense, ExpenseCategory, VegetableMaster, VegetableSale, VegetableSaleItem} from './models';

const MARK = 'यशोधन फार्म यादी';

/** Loads the Yashodhan farm vegetable sheet once. Later launches leave it as saved. */
export async function importFarmSheet(database: Database): Promise<void> {
  const sales = database.get<VegetableSale>('vegetable_sales');
  const existing = await sales.query().fetch();
  if (existing.some(row => (row.notes ?? '').includes(MARK))) {
    return;
  }

  const vegetables = await database.get<VegetableMaster>('vegetable_masters').query().fetch();
  const byName = new Map(vegetables.map(row => [row.name, row.id]));
  const categories = await database.get<ExpenseCategory>('expense_categories').query().fetch();
  const category =
    categories.find(row => row.name === 'इतर' && row.businessType === 'vegetable') ??
    categories.find(row => row.name === 'इतर');

  await database.write(async () => {
    for (const name of new Set(farmSheet.flatMap(row => row.items.map(item => item.name)))) {
      if (byName.has(name)) {
        continue;
      }
      const created = await database.get<VegetableMaster>('vegetable_masters').create(record => {
        record.name = name;
        record.defaultUnit = '₹';
        record.active = true;
      });
      byName.set(name, created.id);
    }

    for (const row of farmSheet) {
      const [year, month, day] = row.date.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      const note = [MARK, row.note].filter(Boolean).join('. ');
      if (row.total > 0) {
        const lines =
          row.items.length > 0
            ? row.items
            : [{name: 'इतर', amount: row.total}];
        const sale = await sales.create(record => {
          record.date = date;
          record.ownershipType = row.kind;
          record.totalAmount = roundMoney(row.total);
          record.notes = note;
        });
        for (const line of lines) {
          const vegetableId = byName.get(line.name);
          if (!vegetableId) {
            continue;
          }
          await database.get<VegetableSaleItem>('vegetable_sale_items').create(record => {
            record.saleId = sale.id;
            record.vegetableId = vegetableId;
            record.quantity = line.amount;
            record.unit = '₹';
            record.saleAmount = roundMoney(line.amount);
            record.appliedRate = 1;
            record.openingQuantity = null;
            record.remainingQuantity = null;
          });
        }
      }
      if (row.expense > 0 && category) {
        await database.get<Expense>('expenses').create(record => {
          record.date = date;
          record.businessType = 'vegetable';
          record.categoryId = category.id;
          record.amount = roundMoney(row.expense);
          record.allocationType = row.kind;
          record.notes = note;
        });
      }
    }
  });
}
