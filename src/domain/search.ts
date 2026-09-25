import {includesText, inDateRange, type ListFilter} from './listFilter';

export type SearchIndex = {
  customers: Array<{name: string; mobile: string; entryDates: number[]}>;
  flour: Array<{date: number; customerName: string | null; grainName: string}>;
  milk: Array<{date: number}>;
  vegetables: Array<{date: number; title: string; subtitle: string}>;
};

export type SearchHit = {
  module: 'flour' | 'dairy' | 'vegetable' | 'udhari';
  title: string;
  detail: string;
  count: number;
  filter: ListFilter;
};

export function searchLedger(
  index: SearchIndex,
  query: {text: string; from: number | null; to: number | null},
): SearchHit[] {
  const text = query.text.trim();
  const hasDate = query.from != null || query.to != null;
  if (!text && !hasDate) {
    return [];
  }
  const range = {from: query.from, to: query.to};
  const filter: ListFilter = {
    text: text || undefined,
    from: query.from ?? undefined,
    to: query.to ?? undefined,
  };
  const flourCount = index.flour.filter(row => {
    if (!inDateRange(row.date, range)) {
      return false;
    }
    if (!text) {
      return true;
    }
    return includesText(row.customerName, text) || includesText(row.grainName, text);
  }).length;
  const vegetableCount = index.vegetables.filter(row => {
    if (!inDateRange(row.date, range)) {
      return false;
    }
    if (!text) {
      return true;
    }
    return includesText(row.title, text) || includesText(row.subtitle, text);
  }).length;
  const dairyCount =
    text.length > 0
      ? 0
      : index.milk.filter(row => inDateRange(row.date, range)).length;
  const udhariCount = index.customers.filter(customer => {
    const nameHit = !text || includesText(customer.name, text) || includesText(customer.mobile, text);
    if (!nameHit) {
      return false;
    }
    if (!hasDate) {
      return true;
    }
    return customer.entryDates.some(date => inDateRange(date, range));
  }).length;

  const hits: SearchHit[] = [
    {module: 'flour', title: 'गिरणी', detail: `${flourCount} नोंदी`, count: flourCount, filter},
    {module: 'dairy', title: 'दूध', detail: `${dairyCount} नोंदी`, count: dairyCount, filter},
    {
      module: 'vegetable',
      title: 'भाजी',
      detail: `${vegetableCount} नोंदी`,
      count: vegetableCount,
      filter,
    },
    {
      module: 'udhari',
      title: 'उधारी',
      detail: `${udhariCount} ग्राहक`,
      count: udhariCount,
      filter,
    },
  ];
  return hits.filter(hit => hit.count > 0);
}
