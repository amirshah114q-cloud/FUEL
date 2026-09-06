import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function LoadingSpinner({ label = 'Loading…' }: { label?: string }): JSX.Element {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

export function LoadingOverlay({ visible, label = 'Please wait…' }: { visible: boolean; label?: string }): JSX.Element | null {
  if (!visible) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </Modal>
  );
}

export function ProgressBar({ progress }: { progress: number }): JSX.Element {
  const percent = Math.max(0, Math.min(100, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl
  },
  label: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600'
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    minWidth: 180
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5
  }
});