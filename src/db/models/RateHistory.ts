import {StampedModel} from '../stampModels';
import {date, field, text} from '@nozbe/watermelondb/decorators';

export class RateHistory extends StampedModel {
  static table = 'rate_histories';

  @text('master_type') masterType!: string;
  @text('item_id') itemId!: string;
  @field('rate') rate!: number;
  @date('effective_from') effectiveFrom!: Date;
  @date('effective_to') effectiveTo!: Date | null;
}
