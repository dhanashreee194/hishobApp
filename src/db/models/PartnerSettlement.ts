import {FinancialModel} from '../stampModels';
import {field, text} from '@nozbe/watermelondb/decorators';

export class PartnerSettlement extends FinancialModel {
  static table = 'partner_settlements';

  @text('period') period!: string;
  @field('shared_sales') sharedSales!: number;
  @field('shared_expenses') sharedExpenses!: number;
  @field('net_shared') netShared!: number;
  @field('partner_share') partnerShare!: number;
  @field('paid') paid!: number;
  @field('remaining') remaining!: number;
}
