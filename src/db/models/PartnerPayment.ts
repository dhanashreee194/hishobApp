import {FinancialModel} from '../stampModels';
import {date, field, text} from '@nozbe/watermelondb/decorators';

export class PartnerPayment extends FinancialModel {
  static table = 'partner_payments';

  @text('partner_id') partnerId!: string;
  @date('date') date!: Date;
  @field('amount') amount!: number;
  @text('notes') notes!: string | null;
}
