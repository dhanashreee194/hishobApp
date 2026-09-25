import {FinancialModel} from '../stampModels';
import {date, field, text} from '@nozbe/watermelondb/decorators';

export class ProductMove extends FinancialModel {
  static table = 'product_moves';

  @date('date') date!: Date;
  @text('business_id') businessId!: string;
  @text('product_id') productId!: string;
  @text('direction') direction!: string;
  @field('quantity') quantity!: number;
  @text('unit') unit!: string;
  @field('amount') amount!: number;
  @field('paid_amount') paidAmount!: number;
  @text('customer_id') customerId!: string | null;
  @text('notes') notes!: string | null;
}
