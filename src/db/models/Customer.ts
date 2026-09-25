import {Query} from '@nozbe/watermelondb';
import {StampedModel} from '../stampModels';
import {children, field, text} from '@nozbe/watermelondb/decorators';
import type {CustomerLedgerEntry} from './CustomerLedgerEntry';
import type {FlourTransaction} from './FlourTransaction';

export class Customer extends StampedModel {
  static table = 'customers';
  static associations = {
    customer_ledger_entries: {
      type: 'has_many' as const,
      foreignKey: 'customer_id',
    },
    flour_transactions: {type: 'has_many' as const, foreignKey: 'customer_id'},
  };

  @text('name') name!: string;
  @text('mobile') mobile!: string | null;
  @text('address') address!: string | null;
  @field('active') active!: boolean;
  @children('customer_ledger_entries')
  ledgerEntries!: Query<CustomerLedgerEntry>;
  @children('flour_transactions') flourTransactions!: Query<FlourTransaction>;
}
