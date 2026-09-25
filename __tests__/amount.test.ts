import {lineTotal, parseIndianDate} from '../src/forms/amount';

test('calculates the line total before save', () => {
  expect(lineTotal({quantity: '2.5', rate: '40'})).toBe(100);
  expect(lineTotal({quantity: '', rate: '40'})).toBeNull();
});

test('parses an Indian date', () => {
  const date = parseIndianDate('23/09/2026');
  expect(date?.getFullYear()).toBe(2026);
  expect(date?.getMonth()).toBe(8);
  expect(date?.getDate()).toBe(23);
  expect(parseIndianDate('31/02/2026')).toBeNull();
});
