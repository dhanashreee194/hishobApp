import {zodResolver} from '@hookform/resolvers/zod';
import React, {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {z} from 'zod';
import {Button, FormScreen, TextField} from '../../components';
import {requiredName} from '../../forms/fields';
import {colors, fonts, spacing} from '../../theme';

const schema = z.object({
  name: requiredName,
  unit: z.string().trim(),
});

type Values = z.infer<typeof schema>;

export type MasterRow = {
  id: string;
  name: string;
  unit: string;
  active: boolean;
};

type Props = {
  showUnit: boolean;
  rows: MasterRow[];
  onSave: (input: {id?: string; name: string; unit: string}) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
};

export function NameMasterScreen({showUnit, rows, onSave, onToggle}: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {name: '', unit: 'किलो'},
    mode: 'onChange',
  });
  const [editing, setEditing] = React.useState<string | null>(null);

  useEffect(() => {
    if (!showUnit) {
      form.setValue('unit', 'नाही');
    }
  }, [form, showUnit]);

  async function submit(values: Values) {
    const unit = showUnit ? values.unit.trim() : 'नाही';
    if (showUnit && !unit) {
      form.setError('unit', {message: 'एकक भरा'});
      return;
    }
    await onSave({id: editing ?? undefined, name: values.name, unit});
    setEditing(null);
    form.reset({name: '', unit: showUnit ? 'किलो' : 'नाही'});
  }

  return (
    <FormScreen>
      <Text style={styles.help}>
        {editing ? 'नोंद दुरुस्त करा. जुने व्यवहार तसेच राहतील.' : 'नवीन नोंद जोडा. कितीही नोंदी ठेवता येतील.'}
      </Text>
      <Controller
        control={form.control}
        name="name"
        render={({field, fieldState}) => (
          <TextField
            label="नाव"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      {showUnit ? (
        <Controller
          control={form.control}
          name="unit"
          render={({field, fieldState}) => (
            <TextField
              label="एकक"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
              placeholder="किलो"
            />
          )}
        />
      ) : null}
      <Button
        label={editing ? 'बदल जतन करा' : 'जोडा'}
        onPress={form.handleSubmit(submit)}
      />
      {editing ? (
        <Button
          label="रद्द"
          variant="secondary"
          onPress={() => {
            setEditing(null);
            form.reset({name: '', unit: showUnit ? 'किलो' : 'नाही'});
          }}
        />
      ) : null}
      <View style={styles.list}>
        {rows.length === 0 ? <Text style={styles.empty}>अजून एकही नोंद नाही.</Text> : null}
        {rows.map(item => (
          <View key={item.id} style={styles.row}>
            <Pressable
              style={styles.rowText}
              onPress={() => {
                setEditing(item.id);
                form.reset({name: item.name, unit: item.unit || 'किलो'});
              }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {showUnit ? item.unit : 'मजुरी'}
                {item.active ? '' : ' · बंद'}
              </Text>
            </Pressable>
            <Pressable onPress={() => onToggle(item.id, !item.active)} style={styles.toggle}>
              <Text style={styles.toggleLabel}>{item.active ? 'बंद करा' : 'सुरू करा'}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  help: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  list: {
    gap: spacing.sm,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textMuted,
  },
  row: {
    minHeight: spacing.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  rowText: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  toggle: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  toggleLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.primary,
  },
});
