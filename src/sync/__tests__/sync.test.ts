import {schema} from '../../db/schema';
import {toE164} from '../phone';
import {backupIsDue, checksum, recordForStorage, resolveByUpdatedAt, syncTableNames} from '../records';

const fs = require('fs') as {
  readdirSync: (dir: string) => string[];
  readFileSync: (file: string, encoding: string) => string;
};
const sql = fs
  .readdirSync('supabase/migrations')
  .filter(name => name.endsWith('.sql'))
  .sort()
  .map(name => fs.readFileSync(`supabase/migrations/${name}`, 'utf8'))
  .join('\n');

function coveredSql(table: string): string {
  const block = sql.match(new RegExp(`create table public\\.${table} \\(([\\s\\S]*?)\\);`));
  const alters = [...sql.matchAll(new RegExp(`alter table public\\.${table}[\\s\\S]*?;`, 'gi'))].map(
    match => match[0],
  );
  return `${block?.[1] ?? ''}\n${alters.join('\n')}`;
}

describe('cloud mirror', () => {
  test('postgres tables and columns match the local schema', () => {
    expect(syncTableNames().sort()).toEqual(Object.keys(schema.tables).sort());
    for (const table of syncTableNames()) {
      const body = coveredSql(table);
      expect(body.trim().length).toBeGreaterThan(0);
      for (const column of Object.keys(schema.tables[table].columns)) {
        expect(body).toContain(column);
      }
      expect(sql).toContain(`alter table public.${table} enable row level security;`);
      expect(sql).toContain(`create policy ${table}_select on public.${table}`);
      expect(sql).toContain('owner_id = auth.uid()');
    }
  });

  test('last write wins when the remote stamp is newer or equal', () => {
    const local = {id: 'a', name: 'स्थानिक', updated_at: 10};
    const remote = {id: 'a', name: 'क्लाउड', updated_at: 20};
    expect(resolveByUpdatedAt(local, remote, {...local}).name).toBe('क्लाउड');
    expect(resolveByUpdatedAt({...local, updated_at: 30}, remote, {...remote}).name).toBe('स्थानिक');
    expect(resolveByUpdatedAt({...local, updated_at: 20}, remote, {...local}).name).toBe('क्लाउड');
  });

  test('stored records drop watermelon bookkeeping and keep an exact stamp', () => {
    const stored = recordForStorage(
      {_status: 'updated', _changed: 'name', id: 'abc', name: 'राम', updated_at: 10.1},
      'customers',
    );
    expect(stored).not.toHaveProperty('_status');
    expect(stored).not.toHaveProperty('_changed');
    expect(stored.updated_at).toBe(10.1);
    expect(stored.name).toBe('राम');
  });

  test('phone numbers become E.164 and a missed night is due', () => {
    expect(toE164('9876543210')).toBe('+919876543210');
    expect(toE164('+919876543210')).toBe('+919876543210');
    expect(toE164('123')).toBeNull();
    const morning = new Date(2026, 8, 24, 9, 0, 0);
    expect(backupIsDue(null, morning)).toBe(true);
    expect(backupIsDue(new Date(2026, 8, 24, 1, 0, 0).getTime(), morning)).toBe(false);
    expect(backupIsDue(new Date(2026, 8, 23, 22, 0, 0).getTime(), morning)).toBe(true);
    expect(checksum('abc')).toBe(checksum('abc'));
    expect(checksum('abc')).not.toBe(checksum('abd'));
  });
});
