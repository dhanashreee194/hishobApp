import {BackupRecord} from './BackupRecord';
import {Business} from './Business';
import {BusinessExpense} from './BusinessExpense';
import {CatalogProduct} from './CatalogProduct';
import {Collaborator} from './Collaborator';
import {Customer} from './Customer';
import {CustomerLedgerEntry} from './CustomerLedgerEntry';
import {Expense} from './Expense';
import {ExpenseCategory} from './ExpenseCategory';
import {FlourItem} from './FlourItem';
import {FlourTransaction} from './FlourTransaction';
import {GrainMaster} from './GrainMaster';
import {MilkEntry} from './MilkEntry';
import {Partner} from './Partner';
import {PartnerPayment} from './PartnerPayment';
import {PartnerScope} from './PartnerScope';
import {PartnerSettlement} from './PartnerSettlement';
import {ProductMove} from './ProductMove';
import {RateHistory} from './RateHistory';
import {StockMovement} from './StockMovement';
import {User} from './User';
import {VegetableMaster} from './VegetableMaster';
import {VegetableSale} from './VegetableSale';
import {VegetableSaleItem} from './VegetableSaleItem';

export const modelClasses = [
  Business,
  CatalogProduct,
  ProductMove,
  BusinessExpense,
  PartnerScope,
  Collaborator,
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
  PartnerPayment,
  PartnerScope,
  PartnerSettlement,
  StockMovement,
  BackupRecord,
];

export {
  BackupRecord,
  Business,
  BusinessExpense,
  CatalogProduct,
  Collaborator,
  Customer,
  CustomerLedgerEntry,
  Expense,
  ExpenseCategory,
  FlourItem,
  FlourTransaction,
  GrainMaster,
  MilkEntry,
  Partner,
  PartnerPayment,
  PartnerScope,
  PartnerSettlement,
  ProductMove,
  RateHistory,
  StockMovement,
  User,
  VegetableMaster,
  VegetableSale,
  VegetableSaleItem,
};
