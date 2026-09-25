import {FinancialModel} from '../stampModels';
import {date, field, text} from '@nozbe/watermelondb/decorators';

export class StockMovement extends FinancialModel {
  static table = 'stock_movements';

  @date('date') date!: Date;
  @text('kind') kind!: string;
  @text('grain_id') grainId!: string;
  @text('direction') direction!: string;
  @field('quantity') quantity!: number;
  @text('unit') unit!: string;
  @text('notes') notes!: string | null;
}
