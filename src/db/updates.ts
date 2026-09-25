import {Database, Q} from '@nozbe/watermelondb';
import {notDeleted} from './queries';
import {startOfDay} from '../domain/dates';
import {MILK_RATE_ITEM_ID} from '../domain/labels';
import {
  compareMoney,
  LedgerError,
  money,
  moneyNumber,
  multiplyMoney,
  netAmount,
  roundMoney,
  sumAmounts,
  sumMoney,
} from '../domain/money';
import {quantity, type StockDirection, type StockKind} from '../domain/stock';
import {loadPartnerSettlement} from './reportData';
import {balanceOf} from './reads';
import {rateOn} from './rates';
import {
  Customer,
  CustomerLedgerEntry,
  Expense,
  FlourItem,
  FlourTransaction,
  GrainMaster,
  MilkEntry,
  PartnerPayment,
  StockMovement,
  VegetableSale,
  VegetableSaleItem,
} from './models';
import type {PeriodKind} from '../domain/reports';

export async function updateFlourEntry(
  database: Database,
  id: string,
  input: {
    date: Date;
    grainId: string;
    quantity: number;
    customerId: string | null;
    paidAmount: number;
    notes: string;
  },
): Promise<void> {
  const grain = await database.get<GrainMaster>('grain_masters').find(input.grainId);
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
  const billNote = `${grain.name} ${input.quantity} ${grain.defaultUnit}`;
  const transaction = await database.get<FlourTransaction>('flour_transactions').find(id);
  const items = await database
    .get<FlourItem>('flour_items')
    .query(Q.where('transaction_id', id))
    .fetch();
  const liveItems = items.filter(item => !item.isDeleted);
  const linked = await database
    .get<CustomerLedgerEntry>('customer_ledger_entries')
    .query(Q.where('reference_id', id), notDeleted())
    .fetch();
  const charge = linked.find(entry => entry.type !== 'payment');
  const payment = linked.find(entry => entry.type === 'payment');

  await database.write(async () => {
    await transaction.update(record => {
      record.date = startOfDay(input.date);
      record.customerId = input.customerId;
      record.totalAmount = total;
      record.paidAmount = paid;
      record.pendingAmount = pending;
      record.notes = note || null;
    });
    const item = liveItems[0];
    if (item) {
      await item.update(record => {
        record.grainId = grain.id;
        record.quantity = input.quantity;
        record.unit = grain.defaultUnit;
        record.appliedRate = rate;
        record.amount = total;
      });
    } else {
      await database.get<FlourItem>('flour_items').create(record => {
        record.transactionId = id;
        record.grainId = grain.id;
        record.quantity = input.quantity;
        record.unit = grain.defaultUnit;
        record.appliedRate = rate;
        record.amount = total;
      });
    }
    for (const extra of liveItems.slice(1)) {
      await extra.update(record => {
        record.isDeleted = true;
      });
    }
    if (!input.customerId) {
      for (const entry of linked) {
        await entry.update(record => {
          record.isDeleted = true;
        });
      }
      return;
    }
    const customerId = input.customerId;
    if (charge) {
      await charge.update(record => {
        record.customerId = customerId;
        record.date = startOfDay(input.date);
        record.amount = total;
        record.notes = billNote;
      });
    } else {
      await database.get<CustomerLedgerEntry>('customer_ledger_entries').create(record => {
        record.customerId = customerId;
        record.date = startOfDay(input.date);
        record.type = 'charge';
        record.amount = total;
        record.businessType = 'flour';
        record.referenceId = id;
        record.notes = billNote;
        record.paymentMode = null;
      });
    }
    if (paid > 0 && payment) {
      await payment.update(record => {
        record.customerId = customerId;
        record.date = startOfDay(input.date);
        record.amount = paid;
        record.notes = 'दळताना जमा';
        record.paymentMode = 'cash';
      });
    } else if (paid > 0) {
      await database.get<CustomerLedgerEntry>('customer_ledger_entries').create(record => {
        record.customerId = customerId;
        record.date = startOfDay(input.date);
        record.type = 'payment';
        record.amount = paid;
        record.businessType = 'flour';
        record.referenceId = id;
        record.notes = 'दळताना जमा';
        record.paymentMode = 'cash';
      });
    } else if (payment) {
      await payment.update(record => {
        record.isDeleted = true;
      });
    }
  });
}

export async function updateMilkEntry(
  database: Database,
  id: string,
  input: {date: Date; supplier: string; litres: number},
): Promise<void> {
  const supplier = input.supplier.trim();
  if (!supplier) {
    throw new LedgerError('पुरवठादाराचे नाव भरा');
  }
  if (!(input.litres > 0)) {
    throw new LedgerError('लिटर शून्यापेक्षा जास्त हवे');
  }
  const rate = await rateOn(database, 'milk', MILK_RATE_ITEM_ID, input.date);
  if (rate == null) {
    throw new LedgerError('या तारखेसाठी दूध दर ठरवलेला नाही');
  }
  const amount = multiplyMoney(input.litres, rate);
  const entry = await database.get<MilkEntry>('milk_entries').find(id);
  await database.write(async () => {
    await entry.update(record => {
      record.date = startOfDay(input.date);
      record.supplierIdOrName = supplier;
      record.quantityLitres = input.litres;
      record.appliedRate = rate;
      record.amount = amount;
    });
  });
}

export async function updateExpense(
  database: Database,
  id: string,
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
  const entry = await database.get<Expense>('expenses').find(id);
  await database.write(async () => {
    await entry.update(record => {
      record.date = startOfDay(input.date);
      record.businessType = input.businessType;
      record.categoryId = input.categoryId;
      record.amount = roundMoney(input.amount);
      record.allocationType = input.allocationType;
      record.notes = input.notes.trim() || null;
    });
  });
}

export async function updateVegetableSale(
  database: Database,
  id: string,
  input: {
    date: Date;
    ownershipType: 'own' | 'shared';
    sales: Array<{vegetableId: string; quantity: number; unit: string; saleAmount: number}>;
  },
): Promise<void> {
  if (input.sales.length === 0) {
    throw new LedgerError('किमान एक विक्री भरा');
  }
  const totalAmount = sumMoney(input.sales.map(line => line.saleAmount));
  const sale = await database.get<VegetableSale>('vegetable_sales').find(id);
  const items = await database
    .get<VegetableSaleItem>('vegetable_sale_items')
    .query(Q.where('sale_id', id), notDeleted())
    .fetch();
  await database.write(async () => {
    await sale.update(record => {
      record.date = startOfDay(input.date);
      record.ownershipType = input.ownershipType;
      record.totalAmount = totalAmount;
    });
    for (const item of items) {
      await item.update(record => {
        record.isDeleted = true;
      });
    }
    for (const line of input.sales) {
      await database.get<VegetableSaleItem>('vegetable_sale_items').create(record => {
        record.saleId = id;
        record.vegetableId = line.vegetableId;
        record.quantity = line.quantity;
        record.unit = line.unit;
        record.saleAmount = roundMoney(line.saleAmount);
      });
    }
  });
}

export async function updateLedgerPayment(
  database: Database,
  id: string,
  input: {date: Date; amount: number; paymentMode: string; notes: string},
): Promise<void> {
  const entry = await database.get<CustomerLedgerEntry>('customer_ledger_entries').find(id);
  if (entry.type !== 'payment' || entry.referenceId) {
    throw new LedgerError('ही नोंद त्या बिलातून सुधारा');
  }
  const entries = await database
    .get<CustomerLedgerEntry>('customer_ledger_entries')
    .query(notDeleted())
    .fetch();
  const balance = balanceOf(entries.filter(row => row.customerId === entry.customerId));
  const room = sumAmounts([balance, entry.amount]);
  const amount = moneyNumber(input.amount);
  if (compareMoney(amount, 0) <= 0) {
    throw new LedgerError('रक्कम शून्यापेक्षा जास्त हवी');
  }
  if (compareMoney(amount, room) > 0) {
    throw new LedgerError('पेमेंट शिलकीपेक्षा जास्त असू शकत नाही');
  }
  await database.write(async () => {
    await entry.update(record => {
      record.date = startOfDay(input.date);
      record.amount = amount;
      record.paymentMode = input.paymentMode;
      record.notes = input.notes.trim() || null;
    });
  });
}

export async function updatePartnerPayment(
  database: Database,
  id: string,
  input: {
    date: Date;
    amount: number;
    notes: string;
    period: PeriodKind;
    anchor: Date;
  },
): Promise<void> {
  const entry = await database.get<PartnerPayment>('partner_payments').find(id);
  const settled = await loadPartnerSettlement(database, entry.partnerId, input.period, input.anchor);
  const room = sumAmounts([settled.remainingPayable, entry.amount]);
  const amount = money(input.amount);
  if (compareMoney(amount, 0) <= 0) {
    throw new LedgerError('रक्कम शून्यापेक्षा जास्त हवी');
  }
  if (compareMoney(amount, room) > 0) {
    throw new LedgerError('पेमेंट देय रकमेपेक्षा जास्त असू शकत नाही');
  }
  await database.write(async () => {
    await entry.update(record => {
      record.date = startOfDay(input.date);
      record.amount = moneyNumber(amount);
      record.notes = input.notes.trim() || null;
    });
  });
}

export async function updateStockMovement(
  database: Database,
  id: string,
  input: {
    date: Date;
    kind: StockKind;
    grainId: string;
    direction: StockDirection;
    quantity: string;
    unit: string;
    notes: string;
  },
): Promise<void> {
  const amount = quantity(input.quantity);
  const entry = await database.get<StockMovement>('stock_movements').find(id);
  await database.write(async () => {
    await entry.update(record => {
      record.date = input.date;
      record.kind = input.kind;
      record.grainId = input.grainId;
      record.direction = input.direction;
      record.quantity = Number(amount);
      record.unit = input.unit;
      record.notes = input.notes.trim() || null;
    });
  });
}

export async function updateCustomer(
  database: Database,
  id: string,
  input: {name: string; mobile: string; address: string},
): Promise<void> {
  const name = input.name.trim();
  if (!name) {
    throw new LedgerError('ग्राहकाचे नाव भरा');
  }
  const customer = await database.get<Customer>('customers').find(id);
  await database.write(async () => {
    await customer.update(record => {
      record.name = name;
      record.mobile = input.mobile.trim() || null;
      record.address = input.address.trim() || null;
    });
  });
}
