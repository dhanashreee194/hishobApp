import {Relation} from '@nozbe/watermelondb';
import {FinancialModel} from '../stampModels';
import {field, relation, text} from '@nozbe/watermelondb/decorators';
import type {VegetableMaster} from './VegetableMaster';
import type {VegetableSale} from './VegetableSale';

export class VegetableSaleItem extends FinancialModel {
  static table = 'vegetable_sale_items';
  static associations = {
    vegetable_sales: {type: 'belongs_to' as const, key: 'sale_id'},
    vegetable_masters: {type: 'belongs_to' as const, key: 'vegetable_id'},
  };

  @text('sale_id') saleId!: string;
  @text('vegetable_id') vegetableId!: string;
  @field('quantity') quantity!: number;
  @text('unit') unit!: string;
  @field('sale_amount') saleAmount!: number;
  @field('applied_rate') appliedRate!: number | null;
  @field('opening_quantity') openingQuantity!: number | null;
  @field('remaining_quantity') remainingQuantity!: number | null;
  @relation('vegetable_sales', 'sale_id') sale!: Relation<VegetableSale>;
  @relation('vegetable_masters', 'vegetable_id')
  vegetable!: Relation<VegetableMaster>;
}
