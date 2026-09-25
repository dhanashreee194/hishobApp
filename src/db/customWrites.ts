import {Database, Q} from '@nozbe/watermelondb';
import {startOfDay} from '../domain/dates';
import {
  asTrackingMode,
  type MoveDirection,
  type TrackingMode,
} from '../domain/customBusiness';
import {LedgerError, compareMoney, moneyNumber, netAmount} from '../domain/money';
import {quantity} from '../domain/stock';
import {Business} from './models/Business';
import {BusinessExpense} from './models/BusinessExpense';
import {CatalogProduct} from './models/CatalogProduct';
import {Collaborator} from './models/Collaborator';
import {Customer} from './models/Customer';
import {CustomerLedgerEntry} from './models/CustomerLedgerEntry';
import {PartnerScope} from './models/PartnerScope';
import {ProductMove} from './models/ProductMove';

export async function saveCustomBusiness(
  database: Database,
  input: {
    id?: string;
    name: string;
    tracking: TrackingMode;
    buys: boolean;
    produces: boolean;
    sells: boolean;
    tracksCredit: boolean;
    tracksBilling: boolean;
    active: boolean;
  },
): Promise<string> {
  const name = input.name.trim();
  if (!name) {
    throw new LedgerError('धंद्याचे नाव भरा');
  }
  const tracking = asTrackingMode(input.tracking);
  if (input.id) {
    const record = await database.get<Business>('businesses').find(input.id);
    await database.write(async () => {
      await record.update(next => {
        next.name = name;
        next.type = tracking;
        next.tracking = tracking;
        next.buys = input.buys;
        next.produces = input.produces;
        next.sells = input.sells;
        next.tracksCredit = input.tracksCredit;
        next.tracksBilling = input.tracksBilling;
        next.active = input.active;
      });
    });
    return record.id;
  }
  const created = await database.write(async () =>
    database.get<Business>('businesses').create(record => {
      record.name = name;
      record.type = tracking;
      record.tracking = tracking;
      record.buys = input.buys;
      record.produces = input.produces;
      record.sells = input.sells;
      record.tracksCredit = input.tracksCredit;
      record.tracksBilling = input.tracksBilling;
      record.active = input.active;
    }),
  );
  return created.id;
}

export async function saveCatalogProduct(
  database: Database,
  input: {businessId: string; name: string; unit: string; kind: 'product' | 'service'},
): Promise<void> {
  const name = input.name.trim();
  const unit = input.unit.trim() || (input.kind === 'service' ? 'नोकरी' : 'नग');
  if (!name) {
    throw new LedgerError('वस्तूचे नाव भरा');
  }
  await database.write(async () => {
    await database.get<CatalogProduct>('catalog_products').create(record => {
      record.businessId = input.businessId;
      record.name = name;
      record.unit = unit;
      record.kind = input.kind;
      record.active = true;
    });
  });
}

export async function recordProductMove(
  database: Database,
  input: {
    businessId: string;
    productId: string;
    direction: MoveDirection;
    date: Date;
    quantity: string;
    amount: string;
    paid: string;
    customerId: string;
    notes: string;
    tracksCredit: boolean;
  },
): Promise<void> {
  let qty = '';
  let amount = 0;
  let paidRaw = 0;
  try {
    qty = quantity(input.quantity);
    amount = moneyNumber(input.amount.trim() || '0');
    paidRaw = input.paid.trim() ? moneyNumber(input.paid) : amount;
  } catch (error) {
    throw new LedgerError(error instanceof Error ? error.message : 'रक्कम योग्य नाही');
  }
  if (compareMoney(paidRaw, amount) > 0) {
    throw new LedgerError('भरलेली रक्कम एकूण रकमेपेक्षा जास्त आहे');
  }
  const pending = netAmount(amount, paidRaw);
  const credit = input.tracksCredit && compareMoney(pending, 0) > 0;
  if (credit && !input.customerId) {
    throw new LedgerError('बाकीसाठी ग्राहक निवडा');
  }
  const product = await database.get<CatalogProduct>('catalog_products').find(input.productId);
  const business = await database.get<Business>('businesses').find(input.businessId);
  const customer = input.customerId
    ? await database.get<Customer>('customers').find(input.customerId)
    : null;
  await database.write(async () => {
    const move = database.get<ProductMove>('product_moves').prepareCreate(record => {
      record.date = startOfDay(input.date);
      record.businessId = input.businessId;
      record.productId = input.productId;
      record.direction = input.direction;
      record.quantity = Number(qty);
      record.unit = product.unit;
      record.amount = amount;
      record.paidAmount = paidRaw;
      record.customerId = customer?.id ?? null;
      record.notes = input.notes.trim() || null;
    });
    const charge =
      credit && customer
        ? database.get<CustomerLedgerEntry>('customer_ledger_entries').prepareCreate(record => {
            record.customerId = customer.id;
            record.date = startOfDay(input.date);
            record.type = 'charge';
            record.amount = moneyNumber(pending);
            record.businessType = 'general';
            record.referenceId = move.id;
            record.notes = `${business.name} · ${product.name}`;
            record.paymentMode = null;
          })
        : null;
    await database.batch(move, ...(charge ? [charge] : []));
  });
}

export async function saveBusinessSpend(
  database: Database,
  input: {businessId: string; kind: 'expense' | 'investment'; date: Date; amount: string; notes: string},
): Promise<void> {
  let amount = 0;
  try {
    amount = moneyNumber(input.amount);
  } catch (error) {
    throw new LedgerError(error instanceof Error ? error.message : 'रक्कम योग्य नाही');
  }
  if (compareMoney(amount, 0) <= 0) {
    throw new LedgerError('रक्कम भरा');
  }
  const kind = input.kind === 'investment' ? 'investment' : 'expense';
  await database.write(async () => {
    await database.get<BusinessExpense>('business_expenses').create(record => {
      record.date = startOfDay(input.date);
      record.businessId = input.businessId;
      record.kind = kind;
      record.amount = amount;
      record.notes = input.notes.trim() || null;
    });
  });
}

export async function savePartnerScope(
  database: Database,
  input: {partnerId: string; businessId: string; productId: string},
): Promise<void> {
  if (!input.partnerId) {
    throw new LedgerError('भागीदार निवडा');
  }
  const productId = input.productId || null;
  const existing = await database
    .get<PartnerScope>('partner_scopes')
    .query(Q.where('partner_id', input.partnerId), Q.where('business_id', input.businessId))
    .fetch();
  const match = existing.find(row => (row.productId || null) === productId);
  if (match) {
    return;
  }
  await database.write(async () => {
    await database.get<PartnerScope>('partner_scopes').create(record => {
      record.partnerId = input.partnerId;
      record.businessId = input.businessId;
      record.productId = productId;
    });
  });
}

export async function saveCollaborator(
  database: Database,
  input: {name: string; phone: string; businessId: string; productId: string},
): Promise<void> {
  const name = input.name.trim();
  const phone = input.phone.replace(/\D/g, '');
  if (!name) {
    throw new LedgerError('सहयोग्याचे नाव भरा');
  }
  if (phone.length < 10) {
    throw new LedgerError('सहयोग्याचा १० अंकी मोबाइल भरा');
  }
  await database.write(async () => {
    await database.get<Collaborator>('collaborators').create(record => {
      record.name = name;
      record.phone = phone.slice(-10);
      record.businessId = input.businessId;
      record.productId = input.productId || null;
      record.active = true;
    });
  });
}
