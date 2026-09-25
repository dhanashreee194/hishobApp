import {chartSeries} from '../../features/reports/chartSeries';
import {overdueCustomers} from '../overdue';
import {reportToCsv, reportToPdf} from '../reportExport';
import {stockBalances} from '../stock';

const fs = require('fs') as {
  readFileSync: (file: string) => Uint8Array;
};

const day = new Date(2026, 8, 24).getTime();

describe('report charts', () => {
  test('each money column is its own series and litres stay off the rupee axis', () => {
    const series = chartSeries(
      ['लिटर', 'रक्कम', 'एकत्रित'],
      [{label: 'सप्टें', cells: ['12.00', '240.00', '240.00']}],
    );
    expect(series.map(item => item.name)).toEqual(['रक्कम', 'एकत्रित']);
    expect(series[0].points[0]).toEqual({label: 'सप्टें', value: 240});
  });
});

describe('overdue udhari', () => {
  test('reminds only when the oldest unpaid charge is old enough', () => {
    const customers = [{id: 'c1', name: 'राम', mobile: '9876543210'}];
    const old = overdueCustomers(
      customers,
      [
        {customerId: 'c1', date: day - 20 * 86400000, type: 'charge', amount: '100.00'},
        {customerId: 'c1', date: day - 10 * 86400000, type: 'payment', amount: '40.00'},
      ],
      15,
      new Date(day),
    );
    expect(old).toEqual([
      {
        customerId: 'c1',
        name: 'राम',
        mobile: '9876543210',
        balance: '60.00',
        oldestUnpaidDate: day - 20 * 86400000,
        daysOverdue: 20,
      },
    ]);

    const recent = overdueCustomers(
      customers,
      [{customerId: 'c1', date: day - 3 * 86400000, type: 'charge', amount: '10.00'}],
      15,
      new Date(day),
    );
    expect(recent).toEqual([]);

    const cleared = overdueCustomers(
      customers,
      [
        {customerId: 'c1', date: day - 40 * 86400000, type: 'charge', amount: '10.00'},
        {customerId: 'c1', date: day - 1 * 86400000, type: 'payment', amount: '10.00'},
      ],
      15,
      new Date(day),
    );
    expect(cleared).toEqual([]);
  });
});

describe('stock', () => {
  test('grain and finished flour stay on separate balances', () => {
    expect(
      stockBalances([
        {grainId: 'wheat', kind: 'grain', direction: 'in', quantity: '10'},
        {grainId: 'wheat', kind: 'grain', direction: 'out', quantity: '3'},
        {grainId: 'wheat', kind: 'flour', direction: 'in', quantity: '2.5'},
        {grainId: 'wheat', kind: 'flour', direction: 'out', quantity: '1'},
      ]),
    ).toEqual([
      {grainId: 'wheat', kind: 'flour', quantity: '1.500'},
      {grainId: 'wheat', kind: 'grain', quantity: '7.000'},
    ]);
  });
});

describe('report export', () => {
  const report = {
    periodLabel: 'सप्टेंबर २०२६',
    headers: ['विक्री', 'खर्च'],
    rows: [{key: 'sep', label: 'सप्टें', cells: ['200.00', '0.00'], chartExact: '200.00'}],
  };

  test('csv is excel-friendly utf-8', () => {
    const csv = reportToCsv(report);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('काळ,विक्री,खर्च');
    expect(csv).toContain('सप्टें,200.00,0.00');
  });

  test('pdf embeds the marathi report', async () => {
    const font = fs.readFileSync('assets/fonts/NotoSansDevanagari-Regular.ttf');
    const pdf = await reportToPdf(report, font);
    const header = String.fromCharCode(...pdf.slice(0, 5));
    expect(header).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
