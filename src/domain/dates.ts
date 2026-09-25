const WEEKDAYS = [
  'रविवार',
  'सोमवार',
  'मंगळवार',
  'बुधवार',
  'गुरुवार',
  'शुक्रवार',
  'शनिवार',
];

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = startOfDay(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function isSameDay(left: Date, right: Date): boolean {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

export function weekdayName(date: Date): string {
  return WEEKDAYS[date.getDay()];
}
