import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EntryStatus } from '../types/models';
import { colors, radius } from '../theme';

const TONES: Record<EntryStatus, { bg: string; text: string; label: string }> = {
  verified: { bg: colors.successSoft, text: colors.success, label: 'Verified' },
  pending: { bg: colors.warningSoft, text: colors.warning, label: 'Pending' },
  rejected: { bg: colors.dangerSoft, text: colors.danger, label: 'Rejected' }
};

export function StatusChip({ status }: { status: EntryStatus }): JSX.Element {
  const tone = TONES[status] ?? TONES.pending;
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.text }]}>{tone.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start'
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  }
});