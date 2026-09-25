import {Database} from '@nozbe/watermelondb';
import {startOfDay} from '../domain/dates';
import {LedgerError} from '../domain/money';
import {RateHistory} from './models';

export async function ratesFor(
  database: Database,
  masterType: string,
  itemId?: string,
): Promise<RateHistory[]> {
  const rows = await database.get<RateHistory>('rate_histories').query().fetch();
  return rows
    .filter(row => row.masterType === masterType && (itemId == null || row.itemId === itemId))
    .sort((left, right) => right.effectiveFrom.getTime() - left.effectiveFrom.getTime());
}

export async function rateOn(
  database: Database,
  masterType: string,
  itemId: string,
  date: Date,
): Promise<number | null> {
  const day = startOfDay(date).getTime();
  const rows = await ratesFor(database, masterType, itemId);
  const match = rows.find(row => {
    const from = startOfDay(row.effectiveFrom).getTime();
    const to = row.effectiveTo ? startOfDay(row.effectiveTo).getTime() : null;
    return from <= day && (to == null || to > day);
  });
  return match ? match.rate : null;
}

/**
 * Inserts a rate that applies from a date. Existing flour and milk rows keep
 * the applied_rate stored on them; this only changes which rate new entries see.
 */
export async function addRate(
  database: Database,
  input: {masterType: string; itemId: string; rate: number; effectiveFrom: Date},
): Promise<void> {
  if (!(input.rate > 0)) {
    throw new LedgerError('दर शून्यापेक्षा जास्त हवा');
  }
  const effectiveFrom = startOfDay(input.effectiveFrom);
  const existing = await ratesFor(database, input.masterType, input.itemId);
  const sameDay = existing.find(
    row => startOfDay(row.effectiveFrom).getTime() === effectiveFrom.getTime(),
  );
  const next = existing
    .filter(row => startOfDay(row.effectiveFrom).getTime() > effectiveFrom.getTime())
    .sort((left, right) => left.effectiveFrom.getTime() - right.effectiveFrom.getTime())[0];
  const previous = existing.find(
    row => startOfDay(row.effectiveFrom).getTime() < effectiveFrom.getTime(),
  );

  await database.write(async () => {
    if (sameDay) {
      await sameDay.update(record => {
        record.rate = input.rate;
      });
      return;
    }

    if (previous) {
      await previous.update(record => {
        record.effectiveTo = effectiveFrom;
      });
    }

    await database.get<RateHistory>('rate_histories').create(record => {
      record.masterType = input.masterType;
      record.itemId = input.itemId;
      record.rate = input.rate;
      record.effectiveFrom = effectiveFrom;
      record.effectiveTo = next ? startOfDay(next.effectiveFrom) : null;
    });
  });
}
