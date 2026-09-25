import {Database} from '@nozbe/watermelondb';
import {ExpenseCategory, GrainMaster, VegetableMaster} from './models';

export const OTHER_ITEM_NAME = 'इतर';

const GRAINS: Array<{name: string; defaultUnit: string}> = [
  {name: 'गहू', defaultUnit: 'किलो'},
  {name: 'बाजरी', defaultUnit: 'किलो'},
  {name: 'ज्वारी', defaultUnit: 'किलो'},
  {name: 'तांदूळ', defaultUnit: 'किलो'},
  {name: OTHER_ITEM_NAME, defaultUnit: 'किलो'},
];

const VEGETABLES: Array<{name: string; defaultUnit: string}> = [
  {name: 'टोमॅटो', defaultUnit: 'किलो'},
  {name: 'कांदा', defaultUnit: 'किलो'},
  {name: 'बटाटा', defaultUnit: 'किलो'},
  {name: 'कोबी', defaultUnit: 'किलो'},
  {name: 'फुलकोबी', defaultUnit: 'किलो'},
  {name: 'वांगी', defaultUnit: 'किलो'},
  {name: 'भेंडी', defaultUnit: 'किलो'},
  {name: 'मिरची', defaultUnit: 'किलो'},
  {name: 'गाजर', defaultUnit: 'किलो'},
  {name: 'काकडी', defaultUnit: 'किलो'},
  {name: 'भोपळा', defaultUnit: 'किलो'},
  {name: 'दुधी भोपळा', defaultUnit: 'किलो'},
  {name: 'गवार', defaultUnit: 'किलो'},
  {name: 'मुळा', defaultUnit: 'किलो'},
  {name: 'बीट', defaultUnit: 'किलो'},
  {name: 'मेथी', defaultUnit: 'जुडी'},
  {name: 'पालक', defaultUnit: 'जुडी'},
  {name: 'कोथिंबीर', defaultUnit: 'जुडी'},
  {name: 'आले', defaultUnit: 'किलो'},
  {name: 'लसूण', defaultUnit: 'किलो'},
  {name: OTHER_ITEM_NAME, defaultUnit: 'किलो'},
];

const EXPENSE_CATEGORIES: Array<{
  name: string;
  businessType: string;
  categoryGroup: string;
}> = [
  {name: 'खत', businessType: 'vegetable', categoryGroup: 'fertilizer'},
  {name: 'बियाणे', businessType: 'vegetable', categoryGroup: 'seed'},
  {name: 'औषध', businessType: 'vegetable', categoryGroup: 'medicine'},
  {name: 'ट्रॅक्टर काम', businessType: 'vegetable', categoryGroup: 'tractor'},
  {name: 'मजुरी', businessType: 'vegetable', categoryGroup: 'labour'},
  {name: 'वीज', businessType: 'general', categoryGroup: 'general'},
  {name: 'दुरुस्ती', businessType: 'general', categoryGroup: 'general'},
  {name: 'वाहतूक', businessType: 'general', categoryGroup: 'general'},
  {name: OTHER_ITEM_NAME, businessType: 'general', categoryGroup: 'general'},
];

export async function seedDatabase(database: Database): Promise<void> {
  const grains = database.get<GrainMaster>('grain_masters');
  const vegetables = database.get<VegetableMaster>('vegetable_masters');
  const categories = database.get<ExpenseCategory>('expense_categories');
  const [grainCount, vegetableCount, categoryCount] = await Promise.all([
    grains.query().fetchCount(),
    vegetables.query().fetchCount(),
    categories.query().fetchCount(),
  ]);

  if (grainCount > 0 && vegetableCount > 0 && categoryCount > 0) {
    return;
  }

  await database.write(async () => {
    if (grainCount === 0) {
      for (const item of GRAINS) {
        await grains.create(record => {
          record.name = item.name;
          record.defaultUnit = item.defaultUnit;
          record.active = true;
        });
      }
    }

    if (vegetableCount === 0) {
      for (const item of VEGETABLES) {
        await vegetables.create(record => {
          record.name = item.name;
          record.defaultUnit = item.defaultUnit;
          record.active = true;
        });
      }
    }

    if (categoryCount === 0) {
      for (const item of EXPENSE_CATEGORIES) {
        await categories.create(record => {
          record.name = item.name;
          record.businessType = item.businessType;
          record.categoryGroup = item.categoryGroup;
          record.active = true;
        });
      }
    }
  });
}
