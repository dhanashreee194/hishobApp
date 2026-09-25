import {
  money,
  netAmount,
  ownerShareAmount,
  partnerShareAmount,
  remainingPayableAmount,
  type MoneyInput,
} from './money';

export type SettlementInput = {
  sharedSales: MoneyInput;
  sharedExpenses: MoneyInput;
  sharePercent: MoneyInput;
  partnerPayments: MoneyInput;
};

export type SettlementResult = {
  sharedSales: string;
  sharedExpenses: string;
  sharedNet: string;
  partnerShare: string;
  ownerShare: string;
  partnerPayments: string;
  remainingPayable: string;
};

/**
 * Shared Net = Shared Sales − Shared Applicable Expenses
 * Partner Share = Shared Net × share %
 * Owner Share = Shared Net − Partner Share
 * Remaining Payable = Partner Share − Partner Payments Recorded
 */
export function settlePartner(input: SettlementInput): SettlementResult {
  const sharedSales = money(input.sharedSales);
  const sharedExpenses = money(input.sharedExpenses);
  const sharedNet = netAmount(sharedSales, sharedExpenses);
  const partnerShare = partnerShareAmount(sharedNet, input.sharePercent);
  const ownerShare = ownerShareAmount(sharedNet, partnerShare);
  const partnerPayments = money(input.partnerPayments);
  const remainingPayable = remainingPayableAmount(partnerShare, partnerPayments);
  return {
    sharedSales,
    sharedExpenses,
    sharedNet,
    partnerShare,
    ownerShare,
    partnerPayments,
    remainingPayable,
  };
}
