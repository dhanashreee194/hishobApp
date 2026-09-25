import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

const nonNegativeNumber = z
  .string()
  .trim()
  .min(1, 'संख्या भरा')
  .refine(value => {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed >= 0;
  }, 'योग्य संख्या भरा');

export const amountLineSchema = z.object({
  quantity: nonNegativeNumber,
  rate: nonNegativeNumber,
});

export type AmountLineValues = z.infer<typeof amountLineSchema>;

export const dateFieldSchema = z
  .string()
  .trim()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'तारीख DD/MM/YYYY स्वरूपात लिहा')
  .refine(value => parseIndianDate(value) instanceof Date, 'ही तारीख योग्य नाही');

export function parseIndianDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function lineTotal(values: {
  quantity: string;
  rate: string;
}): number | null {
  const parsed = amountLineSchema.safeParse(values);
  if (!parsed.success) {
    return null;
  }
  const quantity = Number(parsed.data.quantity.replace(/,/g, ''));
  const rate = Number(parsed.data.rate.replace(/,/g, ''));
  return Math.round(quantity * rate * 100) / 100;
}

export function useAmountLineForm(defaultValues?: Partial<AmountLineValues>) {
  return useForm<AmountLineValues>({
    resolver: zodResolver(amountLineSchema),
    defaultValues: {
      quantity: '',
      rate: '',
      ...defaultValues,
    },
    mode: 'onChange',
  });
}
