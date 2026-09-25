import {StampedModel} from '../stampModels';
import {text} from '@nozbe/watermelondb/decorators';

export class User extends StampedModel {
  static table = 'users';

  @text('name') name!: string;
  @text('phone') phone!: string;
  @text('role') role!: string;
}
