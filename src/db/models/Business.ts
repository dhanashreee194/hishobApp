import {StampedModel} from '../stampModels';
import {field, text} from '@nozbe/watermelondb/decorators';

export class Business extends StampedModel {
  static table = 'businesses';

  @text('name') name!: string;
  @text('type') type!: string;
  @text('tracking') tracking!: string;
  @field('buys') buys!: boolean;
  @field('produces') produces!: boolean;
  @field('sells') sells!: boolean;
  @field('tracks_credit') tracksCredit!: boolean;
  @field('tracks_billing') tracksBilling!: boolean;
  @field('active') active!: boolean;
}
