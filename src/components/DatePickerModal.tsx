import React, {useEffect, useMemo, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {useLocale, useTx} from '../i18n/locale';
import {colors, fonts, spacing} from '../theme';

const MONTHS = [
  'जाने',
  'फेब्रु',
  'मार्च',
  'एप्रि',
  'मे',
  'जून',
  'जुलै',
  'ऑग',
  'सप्टें',
  'ऑक्टो',
  'नोव्हें',
  'डिसें',
];

const WEEK_MR = ['रवि', 'सोम', 'मंग', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
const WEEK_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type Props = {
  visible: boolean;
  value: Date | null;
  onClose: () => void;
  onSelect: (date: Date) => void;
};

export function DatePickerModal({visible, value, onClose, onSelect}: Props) {
  const tx = useTx();
  const locale = useLocale(state => state.locale);
  const initial = value ?? new Date();
  const [cursor, setCursor] = useState(
    () => new Date(initial.getFullYear(), initial.getMonth(), 1),
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    const next = value ?? new Date();
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [visible, value]);

  const cells = useMemo(() => buildCells(cursor), [cursor]);
  const week = locale === 'en' ? WEEK_EN : WEEK_MR;
  const title = `${tx(MONTHS[cursor.getMonth()] ?? '')} ${cursor.getFullYear()}`;

  function shiftMonth(delta: number) {
    setCursor(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function choose(day: number) {
    onSelect(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{tx('तारीख निवडा')}</Text>
          <View style={styles.nav}>
            <Pressable
              accessibilityLabel={tx('मागील महिना')}
              onPress={() => shiftMonth(-1)}
              style={styles.navButton}>
              <Text style={styles.navLabel}>‹</Text>
            </Pressable>
            <Text style={styles.month}>{title}</Text>
            <Pressable
              accessibilityLabel={tx('पुढील महिना')}
              onPress={() => shiftMonth(1)}
              style={styles.navButton}>
              <Text style={styles.navLabel}>›</Text>
            </Pressable>
          </View>
          <View style={styles.yearRow}>
            <Pressable
              accessibilityLabel={tx('मागील वर्ष')}
              onPress={() => shiftMonth(-12)}
              style={styles.yearButton}>
              <Text style={styles.yearLabel}>{tx('मागील वर्ष')}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={tx('पुढील वर्ष')}
              onPress={() => shiftMonth(12)}
              style={styles.yearButton}>
              <Text style={styles.yearLabel}>{tx('पुढील वर्ष')}</Text>
            </Pressable>
          </View>
          <View style={styles.week}>
            {week.map(label => (
              <Text key={label} style={styles.weekLabel}>
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((day, index) =>
              day === null ? (
                <View key={`empty-${index}`} style={styles.day} />
              ) : (
                <Pressable
                  key={day}
                  onPress={() => choose(day)}
                  style={[styles.day, isSelected(value, cursor, day) ? styles.dayOn : null]}>
                  <Text style={[styles.dayLabel, isSelected(value, cursor, day) ? styles.dayLabelOn : null]}>
                    {day}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
          <Pressable onPress={onClose} style={styles.close}>
            <Text style={styles.closeLabel}>{tx('निवड बंद')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildCells(cursor: Date): Array<number | null> {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const leading = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = Array.from({length: leading}, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(day);
  }
  return cells;
}

function isSelected(value: Date | null, cursor: Date, day: number): boolean {
  if (!value) {
    return false;
  }
  return (
    value.getFullYear() === cursor.getFullYear() &&
    value.getMonth() === cursor.getMonth() &&
    value.getDate() === day
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.text,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    minWidth: spacing.touch,
    minHeight: spacing.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontFamily: fonts.semibold,
    fontSize: 28,
    color: colors.primary,
  },
  month: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
  },
  yearRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  yearButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  yearLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primary,
  },
  week: {
    flexDirection: 'row',
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.28%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dayOn: {
    backgroundColor: colors.primary,
  },
  dayLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  dayLabelOn: {
    color: colors.surface,
  },
  close: {
    minHeight: spacing.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.primary,
  },
});
