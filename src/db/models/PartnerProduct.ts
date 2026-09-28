import {StampedModel} from '../stampModels';
import {text} from '@nozbe/watermelondb/decorators';

export class PartnerProduct extends StampedModel {
  static table = 'partner_products';

  @text('partner_id') partnerId!: string;
  @text('product_id') productId!: string;
}
