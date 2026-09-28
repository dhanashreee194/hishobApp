import {BackupRecord} from './BackupRecord';
import {Business} from './Business';
import {Customer} from './Customer';
import {CustomerLedgerEntry} from './CustomerLedgerEntry';
import {Expense} from './Expense';
import {ExpenseCategory} from './ExpenseCategory';
import {FlourItem} from './FlourItem';
import {FlourTransaction} from './FlourTransaction';
import {GrainMaster} from './GrainMaster';
import {MilkEntry} from './MilkEntry';
import {Partner} from './Partner';
import {PartnerProduct} from './PartnerProduct';
import {PartnerPayment} from './PartnerPayment';
import {PartnerSettlement} from './PartnerSettlement';
import {RateHistory} from './RateHistory';
import {StockMovement} from './StockMovement';
import {User} from './User';
import {VegetableMaster} from './VegetableMaster';
import {VegetableSale} from './VegetableSale';
import {VegetableSaleItem} from './VegetableSaleItem';

export const modelClasses = [
  Business,
  User,
  VegetableMaster,
  GrainMaster,
  RateHistory,
  VegetableSale,
  VegetableSaleItem,
  Expense,
  ExpenseCategory,
  Customer,
  CustomerLedgerEntry,
  FlourTransaction,
  FlourItem,
  MilkEntry,
  Partner,
  PartnerProduct,
  PartnerPayment,
  PartnerSettlement,
  StockMovement,
  BackupRecord,
];

export {
  BackupRecord,
  Business,
  Customer,
  CustomerLedgerEntry,
  Expense,
  ExpenseCategory,
  FlourItem,
  FlourTransaction,
  GrainMaster,
  MilkEntry,
  Partner,
  PartnerProduct,
  PartnerPayment,
  PartnerSettlement,
  RateHistory,
  StockMovement,
  User,
  VegetableMaster,
  VegetableSale,
  VegetableSaleItem,
};
