import {StampedModel} from '../stampModels';
import {text} from '@nozbe/watermelondb/decorators';

export class PartnerScope extends StampedModel {
  static table = 'partner_scopes';

  @text('partner_id') partnerId!: string;
  @text('business_id') businessId!: string;
  @text('product_id') productId!: string | null;
}
