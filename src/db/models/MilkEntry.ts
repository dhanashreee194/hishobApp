import {FinancialModel} from '../stampModels';
import {date, field, text} from '@nozbe/watermelondb/decorators';

export class MilkEntry extends FinancialModel {
  static table = 'milk_entries';

  @date('date') date!: Date;
  @text('supplier_id_or_name') supplierIdOrName!: string;
  @field('quantity_litres') quantityLitres!: number;
  @field('applied_rate') appliedRate!: number;
  @field('amount') amount!: number;
}
