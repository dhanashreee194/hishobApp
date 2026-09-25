import {StampedModel} from '../stampModels';
import {field, text} from '@nozbe/watermelondb/decorators';

export class Partner extends StampedModel {
  static table = 'partners';

  @text('name') name!: string;
  @field('share_percent') sharePercent!: number;
  @text('business_type') businessType!: string;
  @field('active') active!: boolean;
}
