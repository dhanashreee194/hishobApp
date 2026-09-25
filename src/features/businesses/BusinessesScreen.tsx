import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Button, FormScreen, RecordCard, Segmented, TextField} from '../../components';
import {database} from '../../db';
import {loadBusinesses, loadCollaboratorViews} from '../../db/customReads';
import {saveCustomBusiness} from '../../db/customWrites';
import {trackingFlags, viewerAccess, type TrackingMode} from '../../domain/customBusiness';
import {LedgerError} from '../../domain/money';
import {useAsyncData} from '../../hooks/useAsyncData';
import {useCopy, useLocale} from '../../i18n/locale';
import {RootStackParamList} from '../../navigation/types';
import {useSyncStatus} from '../../sync/status';
import {colors, fonts, spacing} from '../../theme';

const empty = {businesses: [] as Awaited<ReturnType<typeof loadBusinesses>>, people: [] as Awaited<ReturnType<typeof loadCollaboratorViews>>};

export function BusinessesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const copy = useCopy();
  const locale = useLocale(state => state.locale);
  const phone = useSyncStatus(state => state.phone);
  const role = useSyncStatus(state => state.role);
  const loaded = useAsyncData(async () => {
    const [businesses, people] = await Promise.all([
      loadBusinesses(database),
      loadCollaboratorViews(database),
    ]);
    return {businesses, people};
  }, empty);
  const access = viewerAccess(role, phone, loaded.data.people);
  const visible = loaded.data.businesses.filter(row =>
    access.businessIds == null ? true : access.businessIds.includes(row.id),
  );
  const [name, setName] = useState('');
  const [tracking, setTracking] = useState<TrackingMode>('resale');
  const [flags, setFlags] = useState(trackingFlags('resale'));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function choose(mode: TrackingMode) {
    setTracking(mode);
    setFlags(trackingFlags(mode));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const id = await saveCustomBusiness(database, {
        name,
        tracking,
        ...flags,
        active: true,
      });
      setName('');
      loaded.reload();
      navigation.navigate('BusinessWorkspace', {businessId: id});
    } catch (caught) {
      setError(caught instanceof LedgerError || caught instanceof Error ? caught.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const modes: Array<{value: TrackingMode; label: string}> = [
    {value: 'resale', label: copy.resale},
    {value: 'manufacture', label: copy.manufacture},
    {value: 'service', label: copy.serviceMode},
    {value: 'household', label: copy.household},
  ];

  return (
    <FormScreen>
      <Text style={styles.hint}>{copy.businessHint}</Text>
      {access.viewOnly ? <Text style={styles.note}>{copy.viewOnly}</Text> : null}
      {access.viewOnly ? null : (
        <>
          <TextField label={copy.businessName} value={name} onChangeText={setName} />
          <Segmented label={copy.tracking} value={tracking} options={modes} onChange={choose} />
          <Flag
            label={copy.buys}
            on={flags.buys}
            onPress={() => setFlags(current => ({...current, buys: !current.buys}))}
          />
          <Flag
            label={copy.produces}
            on={flags.produces}
            onPress={() => setFlags(current => ({...current, produces: !current.produces}))}
          />
          <Flag
            label={copy.sells}
            on={flags.sells}
            onPress={() => setFlags(current => ({...current, sells: !current.sells}))}
          />
          <Flag
            label={copy.creditFlag}
            on={flags.tracksCredit}
            onPress={() => setFlags(current => ({...current, tracksCredit: !current.tracksCredit}))}
          />
          <Flag
            label={copy.billingFlag}
            on={flags.tracksBilling}
            onPress={() => setFlags(current => ({...current, tracksBilling: !current.tracksBilling}))}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={saving ? copy.saving : copy.addBusiness} onPress={save} disabled={saving} />
        </>
      )}
      {visible.length === 0 ? <Text style={styles.hint}>{copy.noBusinessYet}</Text> : null}
      {visible.map(row => (
        <RecordCard
          key={row.id}
          title={row.name}
          subtitle={modes.find(mode => mode.value === row.tracking)?.label ?? row.tracking}
          onPress={() => navigation.navigate('BusinessWorkspace', {businessId: row.id})}
        />
      ))}
      <Text style={styles.note}>{locale === 'en' ? 'Vegetable, mill, and milk stay on their own tabs.' : 'भाजी, गिरणी आणि दूध त्यांच्या टॅबवर जसेच्या तसे आहेत.'}</Text>
    </FormScreen>
  );
}

function Flag({label, on, onPress}: {label: string; on: boolean; onPress: () => void}) {
  return (
    <Pressable style={styles.flag} onPress={onPress}>
      <View style={[styles.box, on ? styles.boxOn : null]} />
      <Text style={styles.flagLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, lineHeight: 22},
  note: {fontFamily: fonts.medium, fontSize: 15, color: colors.text},
  error: {fontFamily: fonts.medium, fontSize: 15, color: colors.danger},
  flag: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  boxOn: {backgroundColor: colors.primary},
  flagLabel: {fontFamily: fonts.medium, fontSize: 16, color: colors.text},
});
