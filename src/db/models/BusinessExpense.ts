import {FinancialModel} from '../stampModels';
import {date, field, text} from '@nozbe/watermelondb/decorators';

export class BusinessExpense extends FinancialModel {
  static table = 'business_expenses';

  @date('date') date!: Date;
  @text('business_id') businessId!: string;
  @text('kind') kind!: string;
  @field('amount') amount!: number;
  @text('notes') notes!: string | null;
}
