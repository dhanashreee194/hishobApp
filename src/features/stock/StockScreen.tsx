import React, {useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  Button,
  DateField,
  FormScreen,
  RecordCard,
  Segmented,
  SelectField,
  TextField,
} from '../../components';
import {database} from '../../db';
import {StockMovement} from '../../db/models';
import {notDeleted} from '../../db/queries';
import {loadGrains} from '../../db/reads';
import {LedgerError} from '../../domain/money';
import {
  quantity,
  stockBalances,
  type StockDirection,
  type StockKind,
} from '../../domain/stock';
import {useAsyncData} from '../../hooks/useAsyncData';
import {confirmDelete} from '../records/confirmDelete';
import {updateStockMovement} from '../../db/updates';
import {useTx} from '../../i18n/locale';
import {colors, fonts, formatIndianDate, spacing} from '../../theme';

const KINDS: Array<{value: StockKind; label: string}> = [
  {value: 'grain', label: 'धान्य'},
  {value: 'flour', label: 'पीठ'},
];

const DIRECTIONS: Array<{value: StockDirection; label: string}> = [
  {value: 'in', label: 'आत'},
  {value: 'out', label: 'बाहेर'},
];

export function StockScreen() {
  const grains = useAsyncData(() => loadGrains(database), []);
  const movements = useAsyncData(async () => {
    const rows = await database.get<StockMovement>('stock_movements').query(notDeleted()).fetch();
    return rows
      .map(row => ({
        id: row.id,
        date: row.date.getTime(),
        kind: row.kind as StockKind,
        grainId: row.grainId,
        direction: row.direction as StockDirection,
        quantity: String(row.quantity),
        unit: row.unit,
        notes: row.notes ?? '',
      }))
      .sort((left, right) => right.date - left.date);
  }, []);
  const [kind, setKind] = useState<StockKind>('grain');
  const [direction, setDirection] = useState<StockDirection>('in');
  const [grainId, setGrainId] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const tx = useTx();
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const selected = grains.data.find(grain => grain.id === grainId) ?? grains.data[0] ?? null;

  const balances = useMemo(
    () =>
      stockBalances(
        movements.data.map(row => ({
          grainId: row.grainId,
          kind: row.kind,
          direction: row.direction,
          quantity: row.quantity,
        })),
      ),
    [movements.data],
  );

  async function save() {
    if (!selected) {
      setError('आधी धान्य जोडा.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateStockMovement(database, editingId, {
          date,
          kind,
          grainId: selected.id,
          direction,
          quantity: qty,
          unit: selected.unit,
          notes,
        });
        setEditingId(null);
      } else {
        const amount = quantity(qty);
        await database.write(async () => {
          await database.get<StockMovement>('stock_movements').create(record => {
            record.date = date;
            record.kind = kind;
            record.grainId = selected.id;
            record.direction = direction;
            record.quantity = Number(amount);
            record.unit = selected.unit;
            record.notes = notes.trim() || null;
          });
        });
      }
      setQty('');
      setNotes('');
      await movements.reload();
    } catch (caught) {
      setError(caught instanceof LedgerError || caught instanceof Error ? caught.message : 'जतन झाले नाही');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen>
      <Text style={styles.help}>
        {tx('हा साठा गिरणीच्या बिलापासून वेगळा आहे. धान्य आत-बाहेर आणि पीठ आत-बाहेर इथे नोंदवा.')}
      </Text>
      {grains.data.length === 0 ? <Text style={styles.help}>{tx('आधी गिरणीत धान्य जोडा.')}</Text> : null}
      <Text style={styles.heading}>{tx('धान्य शिल्लक')}</Text>
      {balances.length === 0 ? <Text style={styles.help}>{tx('अजून साठा नाही.')}</Text> : null}
      {balances.map(balance => {
        const grain = grains.data.find(row => row.id === balance.grainId);
        return (
          <Text key={`${balance.kind}-${balance.grainId}`} style={styles.balance}>
            {tx(grain?.name ?? 'धान्य')} · {tx(balance.kind === 'flour' ? 'पीठ' : 'धान्य')} · {balance.quantity}{' '}
            {grain?.unit ? tx(grain.unit) : ''}
          </Text>
        );
      })}
      <Segmented label="साठा" value={kind} onChange={setKind} options={KINDS} />
      <Segmented label="दिशा" value={direction} onChange={setDirection} options={DIRECTIONS} />
      {grains.data.length > 0 ? (
        <SelectField
          label="धान्य"
          value={selected?.id ?? ''}
          options={grains.data.map(grain => ({
            value: grain.id,
            label: grain.name,
            hint: grain.active ? grain.unit : 'बंद',
          }))}
          onChange={setGrainId}
        />
      ) : null}
      <DateField label="तारीख" value={date} onChange={setDate} />
      <TextField label="प्रमाण" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
      <TextField label="टीप" value={notes} onChangeText={setNotes} />
      {editingId ? <Text style={styles.help}>{tx('ही साठा नोंद सुधारत आहात.')}</Text> : null}
      {error ? <Text style={styles.error}>{tx(error)}</Text> : null}
      <Button
        label={saving ? 'जतन होत आहे…' : editingId ? 'सुधार जतन करा' : 'साठा नोंदवा'}
        onPress={save}
        disabled={saving}
      />
      <Text style={styles.heading}>{tx('नोंदी')}</Text>
      {movements.data.map(row => {
        const grain = grains.data.find(item => item.id === row.grainId);
        return (
          <View key={row.id} style={styles.card}>
            <RecordCard
              title={`${formatIndianDate(new Date(row.date))} · ${grain?.name ?? ''}`}
              subtitle={`${row.kind === 'flour' ? 'पीठ' : 'धान्य'} · ${row.direction === 'in' ? 'आत' : 'बाहेर'} · ${row.quantity} ${row.unit}${row.notes ? ` · ${row.notes}` : ''}`}
              onEdit={() => {
                setEditingId(row.id);
                setKind(row.kind);
                setDirection(row.direction);
                setGrainId(row.grainId);
                setDate(new Date(row.date));
                setQty(row.quantity);
                setNotes(row.notes);
              }}
              onDelete={() => confirmDelete('stock_movements', row.id, movements.reload)}
            />
          </View>
        );
      })}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  help: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  balance: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.danger,
  },
  card: {marginBottom: spacing.sm},
});
