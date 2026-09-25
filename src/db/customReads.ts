import {Database, Q} from '@nozbe/watermelondb';
import {asTrackingMode, bulkPositions, type BulkPosition, type TrackingMode} from '../domain/customBusiness';
import {sumAmounts} from '../domain/money';
import {notDeleted} from './queries';
import {Business} from './models/Business';
import {BusinessExpense} from './models/BusinessExpense';
import {CatalogProduct} from './models/CatalogProduct';
import {Collaborator} from './models/Collaborator';
import {Customer} from './models/Customer';
import {Partner} from './models/Partner';
import {PartnerScope} from './models/PartnerScope';
import {ProductMove} from './models/ProductMove';

export type BusinessRow = {
  id: string;
  name: string;
  tracking: TrackingMode;
  buys: boolean;
  produces: boolean;
  sells: boolean;
  tracksCredit: boolean;
  tracksBilling: boolean;
  active: boolean;
};

export type WorkspaceData = {
  business: BusinessRow | null;
  products: Array<{id: string; name: string; unit: string; kind: string}>;
  positions: BulkPosition[];
  moves: Array<{
    id: string;
    date: number;
    productId: string;
    productName: string;
    direction: string;
    quantity: number;
    unit: string;
    amount: number;
    paidAmount: number;
  }>;
  spends: Array<{id: string; date: number; kind: string; amount: number; notes: string}>;
  expenseTotal: string;
  investmentTotal: string;
  sellAmounts: Array<{productId: string; amount: number}>;
  customers: Array<{id: string; name: string; mobile: string}>;
  partners: Array<{id: string; name: string; sharePercent: number}>;
    scopes: Array<{
      id: string;
      partnerName: string;
      productId: string | null;
      productName: string;
      sharePercent: number;
    }>;
  collaborators: Array<{id: string; name: string; phone: string; productName: string; businessId: string; productId: string | null; active: boolean}>;
};

function rowOf(record: Business): BusinessRow {
  return {
    id: record.id,
    name: record.name,
    tracking: asTrackingMode(record.tracking || record.type),
    buys: record.buys,
    produces: record.produces,
    sells: record.sells,
    tracksCredit: record.tracksCredit,
    tracksBilling: record.tracksBilling,
    active: record.active,
  };
}

export async function loadBusinesses(database: Database): Promise<BusinessRow[]> {
  const rows = await database.get<Business>('businesses').query(Q.sortBy('name', Q.asc)).fetch();
  return rows.map(rowOf);
}

export async function loadCollaboratorViews(database: Database) {
  const rows = await database.get<Collaborator>('collaborators').query().fetch();
  return rows.map(row => ({
    phone: row.phone,
    businessId: row.businessId,
    productId: row.productId,
    active: row.active,
  }));
}

export async function loadWorkspace(database: Database, businessId: string): Promise<WorkspaceData> {
  const business = await database.get<Business>('businesses').find(businessId);
  const products = await database
    .get<CatalogProduct>('catalog_products')
    .query(Q.where('business_id', businessId), Q.where('active', true))
    .fetch();
  const moves = await database
    .get<ProductMove>('product_moves')
    .query(notDeleted(), Q.where('business_id', businessId), Q.sortBy('date', Q.desc))
    .fetch();
  const spends = await database
    .get<BusinessExpense>('business_expenses')
    .query(notDeleted(), Q.where('business_id', businessId), Q.sortBy('date', Q.desc))
    .fetch();
  const customers = await database.get<Customer>('customers').query(Q.where('active', true)).fetch();
  const partners = await database.get<Partner>('partners').query(Q.where('active', true)).fetch();
  const scopes = await database
    .get<PartnerScope>('partner_scopes')
    .query(Q.where('business_id', businessId))
    .fetch();
  const collaborators = await database
    .get<Collaborator>('collaborators')
    .query(Q.where('business_id', businessId), Q.where('active', true))
    .fetch();
  const productName = new Map(products.map(product => [product.id, product.name]));
  const partnerName = new Map(partners.map(partner => [partner.id, partner.name]));
  return {
    business: rowOf(business),
    products: products.map(product => ({
      id: product.id,
      name: product.name,
      unit: product.unit,
      kind: product.kind,
    })),
    positions: bulkPositions(
      moves.map(move => ({
        productId: move.productId,
        direction: move.direction === 'produce' || move.direction === 'sell' ? move.direction : 'buy',
        quantity: String(move.quantity),
      })),
    ),
    moves: moves.slice(0, 30).map(move => ({
      id: move.id,
      date: move.date.getTime(),
      productId: move.productId,
      productName: productName.get(move.productId) ?? '',
      direction: move.direction,
      quantity: move.quantity,
      unit: move.unit,
      amount: move.amount,
      paidAmount: move.paidAmount,
    })),
    spends: spends.slice(0, 30).map(spend => ({
      id: spend.id,
      date: spend.date.getTime(),
      kind: spend.kind,
      amount: spend.amount,
      notes: spend.notes ?? '',
    })),
    expenseTotal: sumAmounts(spends.filter(spend => spend.kind !== 'investment').map(spend => spend.amount)),
    investmentTotal: sumAmounts(spends.filter(spend => spend.kind === 'investment').map(spend => spend.amount)),
    sellAmounts: moves
      .filter(move => move.direction === 'sell')
      .map(move => ({productId: move.productId, amount: move.amount})),
    customers: customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      mobile: customer.mobile ?? '',
    })),
    partners: partners.map(partner => ({
      id: partner.id,
      name: partner.name,
      sharePercent: partner.sharePercent,
    })),
    scopes: scopes.map(scope => ({
      id: scope.id,
      partnerName: partnerName.get(scope.partnerId) ?? '',
      productId: scope.productId,
      productName: scope.productId ? productName.get(scope.productId) ?? '' : '',
      sharePercent: partners.find(partner => partner.id === scope.partnerId)?.sharePercent ?? 0,
    })),
    collaborators: collaborators.map(person => ({
      id: person.id,
      name: person.name,
      phone: person.phone,
      productName: person.productId ? productName.get(person.productId) ?? '' : '',
      businessId: person.businessId,
      productId: person.productId,
      active: person.active,
    })),
  };
}
