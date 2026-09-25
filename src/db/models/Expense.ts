import {FinancialModel} from '../stampModels';
import {date, field, text} from '@nozbe/watermelondb/decorators';

export class Expense extends FinancialModel {
  static table = 'expenses';

  @date('date') date!: Date;
  @text('business_type') businessType!: string;
  @text('category_id') categoryId!: string | null;
  @field('amount') amount!: number;
  @text('allocation_type') allocationType!: string;
  @text('notes') notes!: string | null;
}
