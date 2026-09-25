import {Relation} from '@nozbe/watermelondb';
import {FinancialModel} from '../stampModels';
import {date, field, relation, text} from '@nozbe/watermelondb/decorators';
import type {Customer} from './Customer';

export class CustomerLedgerEntry extends FinancialModel {
  static table = 'customer_ledger_entries';
  static associations = {
    customers: {type: 'belongs_to' as const, key: 'customer_id'},
  };

  @text('customer_id') customerId!: string;
  @date('date') date!: Date;
  @text('type') type!: string;
  @field('amount') amount!: number;
  @text('business_type') businessType!: string;
  @text('reference_id') referenceId!: string | null;
  @text('notes') notes!: string | null;
  @text('payment_mode') paymentMode!: string | null;
  @relation('customers', 'customer_id') customer!: Relation<Customer>;
}
