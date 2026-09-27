import {NavigatorScreenParams} from '@react-navigation/native';
import type {ListFilter} from '../domain/listFilter';

export type TabParamList = {
  Home: undefined;
  Bhaji: {filter?: ListFilter; editSaleId?: string} | undefined;
  Girni: {filter?: ListFilter} | undefined;
  Udhari: {filter?: ListFilter} | undefined;
  Reports: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  FlourEntry: {entryId?: string} | undefined;
  GrainMaster: undefined;
  GrainRates: undefined;
  Stock: undefined;
  Dairy: {filter?: ListFilter; entryId?: string} | undefined;
  MilkRates: undefined;
  VegetableMaster: undefined;
  LabourMaster: undefined;
  ExpenseEntry: {expenseId?: string} | undefined;
  CustomerForm: {customerId?: string} | undefined;
  CustomerDetail: {customerId: string};
  RecordPayment: {customerId: string; entryId?: string};
  ReceivePayment: undefined;
  PartnerMaster: undefined;
  PartnerSettlement: {partnerId?: string} | undefined;
  Settings: undefined;
  DeletedRecords: undefined;
};
