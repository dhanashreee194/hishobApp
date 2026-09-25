import {endOfDay} from './dates';

export type ListFilter = {
  text?: string;
  from?: number;
  to?: number;
};

export function inDateRange(
  timestamp: number,
  filter: {from?: number | null; to?: number | null},
): boolean {
  if (filter.from != null && timestamp < filter.from) {
    return false;
  }
  if (filter.to != null && timestamp > endOfDay(new Date(filter.to)).getTime()) {
    return false;
  }
  return true;
}

export function includesText(value: string | null | undefined, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) {
    return true;
  }
  return (value ?? '').toLocaleLowerCase().includes(needle);
}
