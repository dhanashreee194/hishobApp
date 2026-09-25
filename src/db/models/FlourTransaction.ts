import {Query, Relation} from '@nozbe/watermelondb';
import {FinancialModel} from '../stampModels';
import {children, date, field, relation, text} from '@nozbe/watermelondb/decorators';
import type {Customer} from './Customer';
import type {FlourItem} from './FlourItem';

export class FlourTransaction extends FinancialModel {
  static table = 'flour_transactions';
  static associations = {
    customers: {type: 'belongs_to' as const, key: 'customer_id'},
    flour_items: {type: 'has_many' as const, foreignKey: 'transaction_id'},
  };

  @date('date') date!: Date;
  @text('customer_id') customerId!: string | null;
  @field('total_amount') totalAmount!: number;
  @field('paid_amount') paidAmount!: number;
  @field('pending_amount') pendingAmount!: number;
  @text('notes') notes!: string | null;
  @relation('customers', 'customer_id') customer!: Relation<Customer>;
  @children('flour_items') items!: Query<FlourItem>;
}
