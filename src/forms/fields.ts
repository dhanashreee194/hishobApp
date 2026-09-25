import {z} from 'zod';
import {parseNumber} from '../domain/money';
import {dateFieldSchema} from './amount';

function numericString(message: string, predicate: (value: number) => boolean) {
  return z
    .string()
    .trim()
    .min(1, 'संख्या भरा')
    .refine(value => {
      const parsed = parseNumber(value);
      return parsed != null && predicate(parsed);
    }, message);
}

export const positiveNumber = numericString(
  'शून्यापेक्षा जास्त भरा',
  value => value > 0,
);

export const nonNegativeMoney = numericString(
  'योग्य रक्कम भरा',
  value => value >= 0,
);

export const requiredName = z.string().trim().min(1, 'नाव भरा');

export const optionalMobile = z
  .string()
  .trim()
  .refine(value => value === '' || /^\d{10}$/.test(value), '१० अंकी मोबाईल भरा');

export {dateFieldSchema};
