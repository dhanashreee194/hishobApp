import {StampedModel} from '../stampModels';
import {field, text} from '@nozbe/watermelondb/decorators';

export class Business extends StampedModel {
  static table = 'businesses';

  @text('name') name!: string;
  @text('type') type!: string;
  @field('active') active!: boolean;
}
