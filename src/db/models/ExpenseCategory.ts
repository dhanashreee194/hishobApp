import {StampedModel} from '../stampModels';
import {field, text} from '@nozbe/watermelondb/decorators';

export class ExpenseCategory extends StampedModel {
  static table = 'expense_categories';

  @text('name') name!: string;
  @text('business_type') businessType!: string;
  @text('category_group') categoryGroup!: string;
  @field('active') active!: boolean;
}
