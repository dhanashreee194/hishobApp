import {
  balanceFromEntries,
  businessNet,
  lineAmount,
  money,
  multiplyMoney,
  netAmount,
  ownerShareAmount,
  partnerShareAmount,
  remainingPayableAmount,
  runningBalances,
  sumAmounts,
  sumMoney,
} from '../money';
import {settlePartner} from '../settlement';
import {buildFlourReport, buildUdhariReport, buildVegetableReport, scopePartnerBooks} from '../reports';

describe('line amount', () => {
  it('multiplies quantity by rate and rounds half-up to paise', () => {
    expect(lineAmount('4', '12')).toBe('48.00');
    expect(lineAmount('3', '55')).toBe('165.00');
    expect(lineAmount('1.25', '12.40')).toBe('15.50');
    expect(lineAmount('0.1', '0.2')).toBe('0.02');
    expect(lineAmount('10.10', '3')).toBe('30.30');
    expect(lineAmount('1.005', '1')).toBe('1.01');
  });

  it('does not keep the binary product of 10.10 × 3', () => {
    expect(multiplyMoney(10.1, 3)).toBe(30.3);
    expect(Number(lineAmount(10.1, 3))).toBe(30.3);
  });
});

describe('net', () => {
  it('subtracts expenses from sales', () => {
    expect(netAmount('200.00', '50.00')).toBe('150.00');
    expect(netAmount('200.10', '50.10')).toBe('150.00');
    expect(netAmount('100.10', '0.20')).toBe('99.90');
    expect(netAmount('50.00', '80.00')).toBe('-30.00');
  });

  it('sums paise before the final rounding', () => {
    expect(sumAmounts(['0.10', '0.20'])).toBe('0.30');
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it('builds the daily business net from its four parts', () => {
    expect(
      businessNet({
        vegetableSales: '200.00',
        millIncome: '48.00',
        milkExpense: '165.00',
        otherExpenses: '50.00',
      }),
    ).toBe('33.00');
  });
});

describe('partner share', () => {
  it('splits shared net by share percent and subtracts recorded payments', () => {
    const settled = settlePartner({
      sharedSales: '1000.00',
      sharedExpenses: '0.00',
      sharePercent: '30',
      partnerPayments: '100.00',
    });
    expect(settled.sharedNet).toBe('1000.00');
    expect(settled.partnerShare).toBe(partnerShareAmount('1000.00', '30'));
    expect(settled.partnerShare).toBe('300.00');
    expect(settled.ownerShare).toBe(ownerShareAmount('1000.00', '300.00'));
    expect(settled.ownerShare).toBe('700.00');
    expect(settled.remainingPayable).toBe(remainingPayableAmount('300.00', '100.00'));
    expect(settled.remainingPayable).toBe('200.00');
  });

  it('rounds a fractional percent half-up', () => {
    expect(partnerShareAmount('100.00', '33.33')).toBe('33.33');
    expect(partnerShareAmount('1.01', '50')).toBe('0.51');
    expect(money('33.335')).toBe('33.34');
  });

  it('keeps a negative shared net signed', () => {
    const settled = settlePartner({
      sharedSales: '50.00',
      sharedExpenses: '80.00',
      sharePercent: '50',
      partnerPayments: '0',
    });
    expect(settled.sharedNet).toBe('-30.00');
    expect(settled.partnerShare).toBe('-15.00');
    expect(settled.ownerShare).toBe('-15.00');
    expect(settled.remainingPayable).toBe('-15.00');
  });
});

describe('running balance', () => {
  it('applies charges and payments in order', () => {
    expect(
      runningBalances([
        {type: 'charge', amount: '48.00'},
        {type: 'payment', amount: '20.00'},
        {type: 'payment', amount: '28.00'},
      ]),
    ).toEqual(['48.00', '28.00', '0.00']);
  });

  it('stays exact across amounts that are not binary fractions', () => {
    const rows = runningBalances([
      {type: 'charge', amount: '10.10'},
      {type: 'payment', amount: '0.10'},
      {type: 'charge', amount: '10.00'},
    ]);
    expect(rows).toEqual(['10.10', '10.00', '20.00']);
    expect(balanceFromEntries([
      {type: 'charge', amount: '10.10'},
      {type: 'payment', amount: '0.10'},
    ])).toBe('10.00');
  });
});

describe('report totals', () => {
  const september = new Date(2026, 8, 24);

  it('nets vegetable sales and expenses inside the month bucket', () => {
    const report = buildVegetableReport(
      [{date: new Date(2026, 8, 2).getTime(), amount: '200.10'}],
      [{date: new Date(2026, 8, 2).getTime(), amount: '50.10'}],
      'month',
      september,
    );
    expect(report.rows[8].cells).toEqual(['200.10', '50.10', '150.00']);
    expect(report.rows[8].chartExact).toBe('150.00');
  });

  it('carries a progressive flour total', () => {
    const first = new Date(2026, 8, 1).getTime();
    const second = new Date(2026, 8, 2).getTime();
    const report = buildFlourReport(
      [
        {date: first, total: '10.10', paid: '0.00', pending: '10.10'},
        {date: second, total: '0.20', paid: '0.20', pending: '0.00'},
      ],
      'progressive',
      new Date(second),
    );
    expect(report.rows.map(row => row.chartExact)).toEqual(['10.10', '10.30']);
  });

  it('derives udhari closing balances from the running ledger', () => {
    const day = new Date(2026, 8, 24).getTime();
    const report = buildUdhariReport(
      [
        {date: day, type: 'charge', amount: '48.00'},
        {date: day, type: 'payment', amount: '20.00'},
        {date: day + 86400000, type: 'payment', amount: '28.00'},
      ],
      'progressive',
      new Date(day + 86400000),
    );
    expect(report.rows.map(row => row.chartExact)).toEqual(['28.00', '0.00']);
    expect(report.rows[1].cells[1]).toBe('28.00');
  });

  it('keeps a partner share inside the chosen business', () => {
    const day = new Date(2026, 8, 24).getTime();
    const sales = [{date: day, amount: '200.00'}];
    const expenses = [
      {date: day, amount: '40.00', businessType: 'vegetable'},
      {date: day, amount: '90.00', businessType: 'flour'},
    ];
    const vegetable = scopePartnerBooks('vegetable', sales, expenses);
    const flour = scopePartnerBooks('flour', sales, expenses);
    expect(vegetable.sales.map(row => row.amount)).toEqual(['200.00']);
    expect(vegetable.expenses.map(row => row.amount)).toEqual(['40.00']);
    expect(flour.sales).toEqual([]);
    expect(flour.expenses.map(row => row.amount)).toEqual(['90.00']);
  });
});
