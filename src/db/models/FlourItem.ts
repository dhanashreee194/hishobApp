import {Relation} from '@nozbe/watermelondb';
import {FinancialModel} from '../stampModels';
import {field, relation, text} from '@nozbe/watermelondb/decorators';
import type {FlourTransaction} from './FlourTransaction';
import type {GrainMaster} from './GrainMaster';

export class FlourItem extends FinancialModel {
  static table = 'flour_items';
  static associations = {
    flour_transactions: {type: 'belongs_to' as const, key: 'transaction_id'},
    grain_masters: {type: 'belongs_to' as const, key: 'grain_id'},
  };

  @text('transaction_id') transactionId!: string;
  @text('grain_id') grainId!: string;
  @field('quantity') quantity!: number;
  @text('unit') unit!: string;
  @field('applied_rate') appliedRate!: number;
  @field('amount') amount!: number;
  @text('custom_name') customName!: string | null;
  @relation('flour_transactions', 'transaction_id')
  transaction!: Relation<FlourTransaction>;
  @relation('grain_masters', 'grain_id') grain!: Relation<GrainMaster>;
}
