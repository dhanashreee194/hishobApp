import {Database, Q} from '@nozbe/watermelondb';
import {notDeleted} from './queries';
import {startOfDay} from '../domain/dates';
import {OTHER_ITEM_NAME} from './seed';
import type {VegetableSaleInput} from '../domain/sales';
import {
  compareMoney,
  LedgerError,
  money,
  moneyNumber,
  multiplyMoney,
  netAmount,
  roundMoney,
  sumMoney,
} from '../domain/money';
import {loadPartnerSettlement} from './reportData';
import {
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
  PartnerProduct,
  VegetableMaster,
  VegetableSale,
  VegetableSaleItem,
} from './models';
import type {PeriodKind} from '../domain/reports';
import {milkRateOn, rateOn} from './rates';
import {balanceOf} from './reads';

export async function saveFlourEntry(
  database: Database,
  input: {
    date: Date;
    grainId: string;
    otherName?: string;
    quantity: number;
    customerId: string | null;
    paidAmount: number;
    notes: string;
  },
): Promise<void> {
  const grain = await database.get<GrainMaster>('grain_masters').find(input.grainId);
  const otherName = grain.name === OTHER_ITEM_NAME ? (input.otherName ?? '').trim() : '';
  if (grain.name === OTHER_ITEM_NAME && !otherName) {
    throw new LedgerError('धान्याचे नाव भरा');
  }
  const rate = await rateOn(database, 'grain', input.grainId, input.date);
  if (rate == null) {
    throw new LedgerError('या तारखेसाठी धान्याचा दर ठरवलेला नाही');
  }
  if (!(input.quantity > 0)) {
    throw new LedgerError('प्रमाण शून्यापेक्षा जास्त हवे');
  }
  const total = multiplyMoney(input.quantity, rate);
  const paid = moneyNumber(Math.min(Math.max(input.paidAmount, 0), total));
  if (compareMoney(paid, total) < 0 && !input.customerId) {
    throw new LedgerError('बाकी रकमेसाठी ग्राहक निवडा');
  }
  const pending = moneyNumber(netAmount(total, paid));
  const note = input.notes.trim();
  const billNote = `${otherName || grain.name} ${input.quantity} ${grain.defaultUnit}`;

  await database.write(async () => {
    const transaction = await database
      .get<FlourTransaction>('flour_transactions')
      .create(record => {
        record.date = startOfDay(input.date);
        record.customerId = input.customerId;
        record.totalAmount = total;
        record.paidAmount = paid;
        record.pendingAmount = pending;
        record.notes = note || null;
      });
    await database.get<FlourItem>('flour_items').create(record => {
      record.transactionId = transaction.id;
      record.grainId = grain.id;
      record.quantity = input.quantity;
      record.unit = grain.defaultUnit;
      record.appliedRate = rate;
      record.amount = total;
      record.customName = otherName || null;
    });
    if (input.customerId) {
      await database.get<CustomerLedgerEntry>('customer_ledger_entries').create(record => {
        record.customerId = input.customerId as string;
        record.date = startOfDay(input.date);
        record.type = 'charge';
        record.amount = total;
        record.businessType = 'flour';
        record.referenceId = transaction.id;
        record.notes = billNote;
        record.paymentMode = null;
      });
      if (paid > 0) {
        await database.get<CustomerLedgerEntry>('customer_ledger_entries').create(record => {
          record.customerId = input.customerId as string;
          record.date = startOfDay(input.date);
          record.type = 'payment';
          record.amount = paid;
          record.businessType = 'flour';
          record.referenceId = transaction.id;
          record.notes = 'दळताना जमा';
          record.paymentMode = 'cash';
        });
      }
    }
  });
}

export async function saveMilkEntry(
  database: Database,
  input: {date: Date; supplier: string; litres: number},
): Promise<void> {
  const supplier = input.supplier.trim();
  if (!supplier) {
    throw new LedgerError('पुरवठादाराचे नाव भरा');
  }
  if (!(input.litres > 0)) {
    throw new LedgerError('लिटर शून्यापेक्षा जास्त हवे');
  }
  const {rate} = await milkRateOn(database, supplier, input.date);
  if (rate == null) {
    throw new LedgerError('या पुरवठादारासाठी या तारखेला दूध दर नाही');
  }
  const amount = multiplyMoney(input.litres, rate);
  await database.write(async () => {
    await database.get<MilkEntry>('milk_entries').create(record => {
      record.date = startOfDay(input.date);
      record.supplierIdOrName = supplier;
      record.quantityLitres = input.litres;
      record.appliedRate = rate;
      record.amount = amount;
    });
  });
}

export async function saveVegetableDay(
  database: Database,
  input: {
    date: Date;
    ownershipType: 'own' | 'shared';
    sales: VegetableSaleInput[];
    expenses: Array<{categoryId: string; amount: number; notes: string}>;
  },
): Promise<void> {
  if (input.sales.length === 0 && input.expenses.length === 0) {
    throw new LedgerError('विक्री किंवा खर्च भरा');
  }
  const totalAmount = sumMoney(input.sales.map(line => line.saleAmount));
  await database.write(async () => {
    if (input.sales.length > 0) {
      const sale = await database.get<VegetableSale>('vegetable_sales').create(record => {
        record.date = startOfDay(input.date);
        record.ownershipType = input.ownershipType;
        record.totalAmount = totalAmount;
        record.notes = null;
      });
      for (const line of input.sales) {
        await database.get<VegetableSaleItem>('vegetable_sale_items').create(record => {
          record.saleId = sale.id;
          record.vegetableId = line.vegetableId;
          record.quantity = line.quantity;
          record.unit = line.unit;
          record.saleAmount = roundMoney(line.saleAmount);
          record.appliedRate = line.appliedRate;
          record.openingQuantity = line.openingQuantity;
          record.remainingQuantity = line.remainingQuantity;
        });
      }
    }
    for (const line of input.expenses) {
      await database.get<Expense>('expenses').create(record => {
        record.date = startOfDay(input.date);
        record.businessType = 'vegetable';
        record.categoryId = line.categoryId;
        record.amount = roundMoney(line.amount);
        record.allocationType = input.ownershipType;
        record.notes = line.notes.trim() || null;
      });
    }
  });
}

export async function saveExpense(
  database: Database,
  input: {
    date: Date;
    businessType: string;
    categoryId: string;
    amount: number;
    allocationType: string;
    notes: string;
  },
): Promise<void> {
  if (!(input.amount > 0)) {
    throw new LedgerError('रक्कम शून्यापेक्षा जास्त हवी');
  }
  await database.write(async () => {
    await database.get<Expense>('expenses').create(record => {
      record.date = startOfDay(input.date);
      record.businessType = input.businessType;
      record.categoryId = input.categoryId;
      record.amount = roundMoney(input.amount);
      record.allocationType = input.allocationType;
      record.notes = input.notes.trim() || null;
    });
  });
}

export async function saveCustomer(
  database: Database,
  input: {name: string; mobile: string; address: string},
): Promise<void> {
  const name = input.name.trim();
  if (!name) {
    throw new LedgerError('ग्राहकाचे नाव भरा');
  }
  await database.write(async () => {
    await database.get<Customer>('customers').create(record => {
      record.name = name;
      record.mobile = input.mobile.trim() || null;
      record.address = input.address.trim() || null;
      record.active = true;
    });
  });
}

export async function recordPayment(
  database: Database,
  input: {
    customerId: string;
    date: Date;
    amount: number;
    paymentMode: string;
    notes: string;
  },
): Promise<void> {
  const entries = await database
    .get<CustomerLedgerEntry>('customer_ledger_entries')
    .query(notDeleted())
    .fetch();
  const balance = balanceOf(entries.filter(entry => entry.customerId === input.customerId));
  const amount = moneyNumber(input.amount);
  if (compareMoney(amount, 0) <= 0) {
    throw new LedgerError('रक्कम शून्यापेक्षा जास्त हवी');
  }
  if (compareMoney(amount, balance) > 0) {
    throw new LedgerError('पेमेंट शिलकीपेक्षा जास्त असू शकत नाही');
  }
  await database.write(async () => {
    await database.get<CustomerLedgerEntry>('customer_ledger_entries').create(record => {
      record.customerId = input.customerId;
      record.date = startOfDay(input.date);
      record.type = 'payment';
      record.amount = amount;
      record.businessType = 'general';
      record.referenceId = null;
      record.notes = input.notes.trim() || null;
      record.paymentMode = input.paymentMode;
    });
  });
}

export async function createNamedMaster(
  database: Database,
  table: 'grain_masters' | 'vegetable_masters',
  input: {name: string; unit: string},
): Promise<void> {
  const name = input.name.trim();
  const unit = input.unit.trim();
  if (!name || !unit) {
    throw new LedgerError('नाव आणि एकक भरा');
  }
  await database.write(async () => {
    if (table === 'grain_masters') {
      await database.get<GrainMaster>(table).create(record => {
        record.name = name;
        record.defaultUnit = unit;
        record.active = true;
      });
      return;
    }
    await database.get<VegetableMaster>(table).create(record => {
      record.name = name;
      record.defaultUnit = unit;
      record.active = true;
    });
  });
}

export async function updateNamedMaster(
  database: Database,
  table: 'grain_masters' | 'vegetable_masters',
  input: {id: string; name: string; unit: string},
): Promise<void> {
  const name = input.name.trim();
  const unit = input.unit.trim();
  if (!name || !unit) {
    throw new LedgerError('नाव आणि एकक भरा');
  }
  if (table === 'grain_masters') {
    const record = await database.get<GrainMaster>(table).find(input.id);
    await database.write(async () => {
      await record.update(next => {
        next.name = name;
        next.defaultUnit = unit;
      });
    });
    return;
  }
  const record = await database.get<VegetableMaster>(table).find(input.id);
  await database.write(async () => {
    await record.update(next => {
      next.name = name;
      next.defaultUnit = unit;
    });
  });
}

export async function setMasterActive(
  database: Database,
  table: 'grain_masters' | 'vegetable_masters' | 'expense_categories',
  id: string,
  active: boolean,
): Promise<void> {
  if (table === 'grain_masters') {
    const record = await database.get<GrainMaster>(table).find(id);
    await database.write(async () => {
      await record.update(next => {
        next.active = active;
      });
    });
    return;
  }
  if (table === 'vegetable_masters') {
    const record = await database.get<VegetableMaster>(table).find(id);
    await database.write(async () => {
      await record.update(next => {
        next.active = active;
      });
    });
    return;
  }
  const record = await database.get<ExpenseCategory>(table).find(id);
  await database.write(async () => {
    await record.update(next => {
      next.active = active;
    });
  });
}

export async function createLabourCategory(
  database: Database,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new LedgerError('मजुरीचे नाव भरा');
  }
  await database.write(async () => {
    await database.get<ExpenseCategory>('expense_categories').create(record => {
      record.name = trimmed;
      record.businessType = 'vegetable';
      record.categoryGroup = 'labour';
      record.active = true;
    });
  });
}

export async function renameCategory(
  database: Database,
  id: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new LedgerError('नाव भरा');
  }
  const record = await database.get<ExpenseCategory>('expense_categories').find(id);
  await database.write(async () => {
    await record.update(next => {
      next.name = trimmed;
    });
  });
}

export async function savePartner(
  database: Database,
  input: {
    id?: string;
    name: string;
    sharePercent: number;
    businessType: string;
    active: boolean;
    productIds?: string[];
  },
): Promise<void> {
  const name = input.name.trim();
  if (!name) {
    throw new LedgerError('भागीदाराचे नाव भरा');
  }
  const businessType = ['flour', 'vegetable', 'milk', 'general'].includes(input.businessType)
    ? input.businessType
    : '';
  if (!businessType) {
    throw new LedgerError('धंदा निवडा');
  }
  const sharePercent = moneyNumber(input.sharePercent);
  if (compareMoney(sharePercent, 0) <= 0 || compareMoney(sharePercent, 100) > 0) {
    throw new LedgerError('वाटा ० पेक्षा जास्त आणि १०० पर्यंत हवा');
  }
  const productIds = [...new Set((input.productIds ?? []).map(id => id.trim()).filter(Boolean))];
  let partnerId = input.id;
  if (partnerId) {
    const record = await database.get<Partner>('partners').find(partnerId);
    await database.write(async () => {
      await record.update(next => {
        next.name = name;
        next.sharePercent = sharePercent;
        next.businessType = businessType;
        next.active = input.active;
      });
    });
  } else {
    await database.write(async () => {
      const record = await database.get<Partner>('partners').create(next => {
        next.name = name;
        next.sharePercent = sharePercent;
        next.businessType = businessType;
        next.active = input.active;
      });
      partnerId = record.id;
    });
  }
  const existing = await database
    .get<PartnerProduct>('partner_products')
    .query(Q.where('partner_id', partnerId ?? ''))
    .fetch();
  await database.write(async () => {
    for (const row of existing) {
      await row.markAsDeleted();
    }
    for (const productId of productIds) {
      await database.get<PartnerProduct>('partner_products').create(next => {
        next.partnerId = partnerId ?? '';
        next.productId = productId;
      });
    }
  });
}

export async function setPartnerActive(
  database: Database,
  id: string,
  active: boolean,
): Promise<void> {
  const record = await database.get<Partner>('partners').find(id);
  await database.write(async () => {
    await record.update(next => {
      next.active = active;
    });
  });
}

export async function recordPartnerPayment(
  database: Database,
  input: {
    partnerId: string;
    date: Date;
    amount: number;
    notes: string;
    period: PeriodKind;
    anchor: Date;
  },
): Promise<void> {
  const settled = await loadPartnerSettlement(
    database,
    input.partnerId,
    input.period,
    input.anchor,
  );
  const amount = money(input.amount);
  if (compareMoney(amount, 0) <= 0) {
    throw new LedgerError('रक्कम शून्यापेक्षा जास्त हवी');
  }
  if (compareMoney(amount, settled.remainingPayable) > 0) {
    throw new LedgerError('पेमेंट देय रकमेपेक्षा जास्त असू शकत नाही');
  }
  await database.write(async () => {
    await database.get<PartnerPayment>('partner_payments').create(record => {
      record.partnerId = input.partnerId;
      record.date = startOfDay(input.date);
      record.amount = moneyNumber(amount);
      record.notes = input.notes.trim() || null;
    });
  });
}
