import {RouteProp, useRoute} from '@react-navigation/native';
import React, {useState} from 'react';
import {StyleSheet, Text} from 'react-native';
import {
  Button,
  DateField,
  FormScreen,
  RecordCard,
  SelectField,
  TextField,
} from '../../components';
import {database} from '../../db';
import {loadCollaboratorViews, loadWorkspace, type WorkspaceData} from '../../db/customReads';
import {
  recordProductMove,
  saveBusinessSpend,
  saveCatalogProduct,
  saveCollaborator,
  saveCustomBusiness,
  savePartnerScope,
} from '../../db/customWrites';
import {softDeleteRecord} from '../../db/deletion';
import {scopedPartnerShare, viewerAccess, type MoveDirection} from '../../domain/customBusiness';
import {LedgerError, sumAmounts} from '../../domain/money';
import {dueText, openWhatsApp, paidText} from '../../domain/whatsapp';
import {useAsyncData} from '../../hooks/useAsyncData';
import {useCopy, useLocale} from '../../i18n/locale';
import {RootStackParamList} from '../../navigation/types';
import {useSyncStatus} from '../../sync/status';
import {colors, fonts, formatIndianDate, formatInr, spacing} from '../../theme';

const blank: WorkspaceData = {
  business: null,
  products: [],
  positions: [],
  moves: [],
  spends: [],
  expenseTotal: '0.00',
  investmentTotal: '0.00',
  sellAmounts: [],
  customers: [],
  partners: [],
  scopes: [],
  collaborators: [],
};

export function BusinessWorkspaceScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'BusinessWorkspace'>>();
  const copy = useCopy();
  const locale = useLocale(state => state.locale);
  const phone = useSyncStatus(state => state.phone);
  const role = useSyncStatus(state => state.role);
  const loaded = useAsyncData(
    () => loadWorkspace(database, route.params.businessId),
    blank,
  );
  const people = useAsyncData(() => loadCollaboratorViews(database), []);
  const access = viewerAccess(role, phone, people.data);
  const allowedProducts = access.productIds(route.params.businessId);
  const business = loaded.data.business;
  const products = loaded.data.products.filter(product =>
    allowedProducts == null ? true : allowedProducts.includes(product.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState('');
  const [unit, setUnit] = useState('');
  const [productId, setProductId] = useState('');
  const [direction, setDirection] = useState<MoveDirection>('buy');
  const [date, setDate] = useState(() => new Date());
  const [qty, setQty] = useState('');
  const [amount, setAmount] = useState('');
  const [paid, setPaid] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [spendKind, setSpendKind] = useState<'expense' | 'investment'>('expense');
  const [spendAmount, setSpendAmount] = useState('');
  const [spendNotes, setSpendNotes] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [scopeProduct, setScopeProduct] = useState('');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personProduct, setPersonProduct] = useState('');

  async function run(action: () => Promise<void>) {
    setSaving(true);
    setError(null);
    try {
      await action();
      await loaded.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (!business) {
    return (
      <FormScreen>
        <Text style={styles.hint}>{loaded.error ?? copy.saving}</Text>
      </FormScreen>
    );
  }

  const directions: Array<{value: MoveDirection; label: string}> = [
    business.buys ? {value: 'buy' as const, label: copy.bought} : null,
    business.produces ? {value: 'produce' as const, label: copy.produced} : null,
    business.sells ? {value: 'sell' as const, label: copy.sold} : null,
  ].filter((row): row is {value: MoveDirection; label: string} => row != null);
  const moveDirection = directions.some(row => row.value === direction)
    ? direction
    : directions[0]?.value ?? 'buy';

  return (
    <FormScreen>
      <Text style={styles.title}>{business.name}</Text>
      {access.viewOnly ? <Text style={styles.note}>{copy.viewOnly}</Text> : null}
      <Text style={styles.section}>{copy.onHand}</Text>
      {loaded.data.positions
        .filter(row => (allowedProducts == null ? true : allowedProducts.includes(row.productId)))
        .map(row => {
          const product = products.find(item => item.id === row.productId);
          return (
            <Text key={row.productId} style={styles.line}>
              {product?.name ?? row.productId}: {copy.bought} {row.bought} · {copy.produced}{' '}
              {row.produced} · {copy.sold} {row.sold} · {copy.onHand} {row.onHand} {product?.unit ?? ''}
            </Text>
          );
        })}
      <Text style={styles.line}>
        {copy.expenseWord} {formatInr(Number(loaded.data.expenseTotal))} · {copy.investment}{' '}
        {formatInr(Number(loaded.data.investmentTotal))}
      </Text>
      {loaded.data.scopes.map(scope => {
        const sales = sumAmounts(
          loaded.data.sellAmounts
            .filter(move => scope.productId == null || move.productId === scope.productId)
            .map(move => move.amount),
        );
        const expenses = scope.productId
          ? '0.00'
          : sumAmounts([loaded.data.expenseTotal, loaded.data.investmentTotal]);
        const share = scopedPartnerShare({
          sales,
          expenses,
          sharePercent: String(scope.sharePercent),
        });
        return (
          <Text key={scope.id} style={styles.line}>
            {scope.partnerName} · {scope.productName || copy.wholeBusiness} · {copy.partnership}{' '}
            {formatInr(Number(share.partnerShare))}
          </Text>
        );
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {access.viewOnly ? null : (
        <>
          <Text style={styles.section}>{copy.products}</Text>
          <TextField label={copy.productName} value={productName} onChangeText={setProductName} />
          <TextField label={copy.unit} value={unit} onChangeText={setUnit} placeholder="kg" />
          <Button
            label={copy.addProduct}
            disabled={saving}
            onPress={() =>
              run(async () => {
                await saveCatalogProduct(database, {
                  businessId: business.id,
                  name: productName,
                  unit,
                  kind: business.tracking === 'service' ? 'service' : 'product',
                });
                setProductName('');
                setUnit('');
              })
            }
          />
          {directions.length > 0 && products.length > 0 ? (
            <>
              <Text style={styles.section}>{copy.move}</Text>
              <SelectField
                label={copy.products}
                value={productId}
                options={products.map(product => ({value: product.id, label: product.name}))}
                onChange={setProductId}
              />
              <SelectField
                label={copy.tracking}
                value={moveDirection}
                options={directions}
                onChange={value => setDirection(value as MoveDirection)}
              />
              <DateField value={date} onChange={setDate} />
              <TextField label={copy.quantity} value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
              <TextField label={copy.amount} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
              {business.sells && moveDirection === 'sell' ? (
                <>
                  <TextField label={copy.paid} value={paid} onChangeText={setPaid} keyboardType="decimal-pad" />
                  <SelectField
                    label={copy.customer}
                    value={customerId}
                    options={loaded.data.customers.map(customer => ({
                      value: customer.id,
                      label: customer.name,
                    }))}
                    onChange={setCustomerId}
                    allowEmpty
                    emptyLabel={copy.noCustomer}
                  />
                </>
              ) : null}
              <TextField label={copy.notes} value={notes} onChangeText={setNotes} />
              <Button
                label={saving ? copy.saving : copy.save}
                disabled={saving || !productId}
                onPress={() =>
                  run(async () => {
                    await recordProductMove(database, {
                      businessId: business.id,
                      productId,
                      direction: moveDirection,
                      date,
                      quantity: qty,
                      amount,
                      paid: moveDirection === 'sell' ? paid : amount,
                      customerId,
                      notes,
                      tracksCredit: business.tracksCredit && moveDirection === 'sell',
                    });
                    setQty('');
                    setAmount('');
                    setPaid('');
                    setNotes('');
                  })
                }
              />
            </>
          ) : null}
          <Text style={styles.section}>{copy.spend}</Text>
          <SelectField
            label={copy.spend}
            value={spendKind}
            options={[
              {value: 'expense', label: copy.expenseWord},
              {value: 'investment', label: copy.investment},
            ]}
            onChange={value => setSpendKind(value === 'investment' ? 'investment' : 'expense')}
          />
          <TextField
            label={copy.amount}
            value={spendAmount}
            onChangeText={setSpendAmount}
            keyboardType="decimal-pad"
          />
          <TextField label={copy.notes} value={spendNotes} onChangeText={setSpendNotes} />
          <Button
            label={copy.save}
            disabled={saving}
            onPress={() =>
              run(async () => {
                await saveBusinessSpend(database, {
                  businessId: business.id,
                  kind: spendKind,
                  date,
                  amount: spendAmount,
                  notes: spendNotes,
                });
                setSpendAmount('');
                setSpendNotes('');
              })
            }
          />
          <Text style={styles.section}>{copy.partnerScope}</Text>
          <Text style={styles.hint}>{copy.partnerScopeHint}</Text>
          <SelectField
            label={copy.partners}
            value={partnerId}
            options={loaded.data.partners.map(partner => ({
              value: partner.id,
              label: `${partner.name} · ${partner.sharePercent}%`,
            }))}
            onChange={setPartnerId}
          />
          <SelectField
            label={copy.products}
            value={scopeProduct}
            options={products.map(product => ({value: product.id, label: product.name}))}
            onChange={setScopeProduct}
            allowEmpty
            emptyLabel={copy.wholeBusiness}
          />
          <Button
            label={copy.save}
            disabled={saving || !partnerId}
            onPress={() =>
              run(() =>
                savePartnerScope(database, {
                  partnerId,
                  businessId: business.id,
                  productId: scopeProduct,
                }),
              )
            }
          />
          <Text style={styles.section}>{copy.collaborator}</Text>
          <Text style={styles.hint}>{copy.collaboratorHint}</Text>
          <TextField label={copy.personName} value={personName} onChangeText={setPersonName} />
          <TextField
            label={copy.mobile}
            value={personPhone}
            onChangeText={setPersonPhone}
            keyboardType="phone-pad"
          />
          <SelectField
            label={copy.products}
            value={personProduct}
            options={products.map(product => ({value: product.id, label: product.name}))}
            onChange={setPersonProduct}
            allowEmpty
            emptyLabel={copy.wholeBusiness}
          />
          <Button
            label={copy.invite}
            disabled={saving}
            onPress={() =>
              run(async () => {
                await saveCollaborator(database, {
                  name: personName,
                  phone: personPhone,
                  businessId: business.id,
                  productId: personProduct,
                });
                const product = products.find(item => item.id === personProduct);
                const text =
                  locale === 'en'
                    ? `You can view ${business.name}${product ? ` (${product.name})` : ''} in Maza Hishob.`
                    : `तुम्ही माझा हिशोब मध्ये ${business.name}${product ? ` (${product.name})` : ''} पाहू शकता.`;
                const opened = await openWhatsApp(personPhone, text);
                if (!opened) {
                  throw new LedgerError(copy.whatsappMissing);
                }
                setPersonName('');
                setPersonPhone('');
              })
            }
          />
        </>
      )}
      <Text style={styles.section}>{copy.recent}</Text>
      {loaded.data.moves
        .filter(move => (allowedProducts == null ? true : allowedProducts.includes(move.productId)))
        .map(move => (
          <RecordCard
            key={move.id}
            title={`${formatIndianDate(new Date(move.date))} · ${move.productName}`}
            subtitle={`${move.direction} · ${move.quantity} ${move.unit}`}
            amount={move.amount}
            onDelete={
              access.viewOnly
                ? undefined
                : () => run(() => softDeleteRecord(database, 'product_moves', move.id))
            }
          />
        ))}
      {loaded.data.spends.map(spend => (
        <RecordCard
          key={spend.id}
          title={spend.kind === 'investment' ? copy.investment : copy.expenseWord}
          subtitle={`${formatIndianDate(new Date(spend.date))} · ${spend.notes}`}
          amount={spend.amount}
          tone="out"
          onDelete={
            access.viewOnly
              ? undefined
              : () => run(() => softDeleteRecord(database, 'business_expenses', spend.id))
          }
        />
      ))}
      {loaded.data.collaborators.map(person => (
        <Text key={person.id} style={styles.line}>
          {person.name} · {person.phone}
          {person.productName ? ` · ${person.productName}` : ` · ${copy.wholeBusiness}`}
        </Text>
      ))}
      <Button
        label={copy.whatsappDue}
        variant="secondary"
        onPress={() => {
          const customer = loaded.data.customers.find(item => item.mobile);
          if (!customer) {
            setError(copy.whatsappMissing);
            return;
          }
          const pending = sumAmounts(
            loaded.data.moves
              .filter(move => move.direction === 'sell')
              .map(move => Math.max(move.amount - move.paidAmount, 0)),
          );
          openWhatsApp(customer.mobile, dueText(locale, customer.name, formatInr(Number(pending)))).then(opened => {
            if (!opened) {
              setError(copy.whatsappMissing);
            }
          });
        }}
      />
      <Button
        label={copy.whatsappPaid}
        variant="secondary"
        onPress={() => {
          const customer = loaded.data.customers.find(item => item.mobile);
          const latest = loaded.data.moves.find(move => move.direction === 'sell' && move.paidAmount > 0);
          if (!customer || !latest) {
            setError(copy.whatsappMissing);
            return;
          }
          openWhatsApp(customer.mobile, paidText(locale, customer.name, formatInr(latest.paidAmount))).then(
            opened => {
              if (!opened) {
                setError(copy.whatsappMissing);
              }
            },
          );
        }}
      />
      {access.viewOnly ? null : (
        <Button
          label={business.active ? copy.hideBusiness : copy.showBusiness}
          variant="secondary"
          onPress={() =>
            run(async () => {
              await saveCustomBusiness(database, {
                id: business.id,
                name: business.name,
                tracking: business.tracking,
                buys: business.buys,
                produces: business.produces,
                sells: business.sells,
                tracksCredit: business.tracksCredit,
                tracksBilling: business.tracksBilling,
                active: !business.active,
              });
            })
          }
        />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  title: {fontFamily: fonts.bold, fontSize: 28, color: colors.text},
  section: {fontFamily: fonts.semibold, fontSize: 18, color: colors.text, marginTop: spacing.sm},
  hint: {fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, lineHeight: 22},
  note: {fontFamily: fonts.medium, fontSize: 15, color: colors.text},
  line: {fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 22},
  error: {fontFamily: fonts.medium, fontSize: 15, color: colors.danger},
});
