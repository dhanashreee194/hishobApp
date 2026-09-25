import {StampedModel} from '../stampModels';
import {field, text} from '@nozbe/watermelondb/decorators';

export class CatalogProduct extends StampedModel {
  static table = 'catalog_products';

  @text('business_id') businessId!: string;
  @text('name') name!: string;
  @text('unit') unit!: string;
  @text('kind') kind!: string;
  @field('active') active!: boolean;
}
