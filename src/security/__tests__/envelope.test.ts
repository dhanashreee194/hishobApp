import {formatIndianDate, formatInr} from '../../theme/format';
import {
  hashPin,
  openSnapshot,
  sealSnapshot,
  verifyPin,
  wrapKey,
  BackupPinRequired,
} from '../envelope';
import {randomBytes} from '@noble/ciphers/utils.js';

const snapshot = JSON.stringify({
  version: 1,
  createdAt: 1,
  tables: {milk_entries: [{id: 'a', amount: 12.5}]},
});

describe('backup envelope', () => {
  test('a sealed file opens with the device key and hides the ledger text', () => {
    const key = randomBytes(32);
    const sealed = sealSnapshot(snapshot, key, null);
    expect(sealed).not.toContain('milk_entries');
    expect(openSnapshot(sealed, key, null)).toBe(snapshot);
  });

  test('another phone opens the file with the PIN wrap', () => {
    const key = randomBytes(32);
    const sealed = sealSnapshot(snapshot, key, wrapKey(key, '2468', 2000));
    expect(() => openSnapshot(sealed, null, null)).toThrow(BackupPinRequired);
    expect(openSnapshot(sealed, null, '2468')).toBe(snapshot);
    expect(() => openSnapshot(sealed, null, '0000')).toThrow('पिन चुकीचा आहे');
  });

  test('a version 1 plaintext snapshot still restores', () => {
    expect(openSnapshot(snapshot, null, null)).toBe(snapshot);
  });

  test('PIN verification rejects a different PIN', () => {
    const stored = hashPin('1357', 2000);
    expect(verifyPin('1357', stored)).toBe(true);
    expect(verifyPin('1358', stored)).toBe(false);
  });
});

describe('Indian formats', () => {
  test('rupees use Indian grouping and dates stay day first', () => {
    expect(formatInr(200000)).toBe('₹2,00,000.00');
    expect(formatInr(200)).toBe('₹200.00');
    expect(formatInr(-1250.5)).toBe('-₹1,250.50');
    expect(formatIndianDate(new Date(2026, 8, 24))).toBe('24/09/2026');
  });
});
