import {Query} from '@nozbe/watermelondb';
import {FinancialModel} from '../stampModels';
import {children, date, field, text} from '@nozbe/watermelondb/decorators';
import type {VegetableSaleItem} from './VegetableSaleItem';

export class VegetableSale extends FinancialModel {
  static table = 'vegetable_sales';
  static associations = {
    vegetable_sale_items: {type: 'has_many' as const, foreignKey: 'sale_id'},
  };

  @date('date') date!: Date;
  @text('ownership_type') ownershipType!: string;
  @field('total_amount') totalAmount!: number;
  @text('notes') notes!: string | null;
  @children('vegetable_sale_items') items!: Query<VegetableSaleItem>;
}
