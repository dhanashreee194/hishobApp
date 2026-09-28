import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button} from '../../components';
import {FormScreen} from '../../components/FormScreen';
import {persistStatus} from '../../sync/synchronize';
import {useSyncStatus} from '../../sync/status';
import {useTx} from '../../i18n/locale';
import {colors, fonts, spacing} from '../../theme';
import {PhoneAuthForm} from './PhoneAuthForm';

type Props = {
  onContinue: () => void;
};

export function OnboardingScreen({onContinue}: Props) {
  const tx = useTx();
  async function skip() {
    useSyncStatus.getState().patch({skippedAuth: true});
    await persistStatus();
    onContinue();
  }

  return (
    <FormScreen>
      <View style={styles.stack}>
      <View style={styles.header}>
        <Text style={styles.title}>{tx('माझा हिशोब')}</Text>
        <Text style={styles.subtitle}>{tx('फोन नंबर आणि OTP ने प्रवेश करा.')}</Text>
      </View>
      <PhoneAuthForm onSignedIn={onContinue} />
      <Button label="ऑफलाइन सुरू ठेवा" variant="secondary" onPress={skip} />
      <Text style={styles.note}>{tx('सिंक अयशस्वी झाले तरी स्थानिक नोंदी थांबत नाहीत.')}</Text>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  stack: {gap: spacing.md},
  header: {gap: spacing.xs},
  title: {fontFamily: fonts.bold, fontSize: 28, color: colors.text},
  subtitle: {fontFamily: fonts.regular, fontSize: 16, color: colors.textMuted},
  note: {fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 20},
});
