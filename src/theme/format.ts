import {money} from '../domain/money';

export function formatInr(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '₹0.00';
  }
  return formatExactRupees(money(amount));
}

export function formatExactRupees(exact: string): string {
  const negative = exact.trim().startsWith('-');
  const [whole, fraction = '00'] = exact.trim().replace('-', '').split('.');
  const digits = whole.replace(/\D/g, '') || '0';
  const grouped =
    digits.length <= 3
      ? digits
      : `${digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${digits.slice(-3)}`;
  return `${negative ? '-' : ''}₹${grouped}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

export function formatIndianDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}
