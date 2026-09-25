import {StampedModel} from '../stampModels';
import {field, text} from '@nozbe/watermelondb/decorators';

export class Collaborator extends StampedModel {
  static table = 'collaborators';

  @text('name') name!: string;
  @text('phone') phone!: string;
  @text('business_id') businessId!: string;
  @text('product_id') productId!: string | null;
  @field('active') active!: boolean;
}
