import React, { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, radius, spacing } from '../theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon?: IoniconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'receipt-outline', title, message, actionLabel, onAction }: EmptyStateProps): JSX.Element {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={30} color={colors.muted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" onPress={onAction} style={{ marginTop: spacing.lg }} />
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): JSX.Element {
  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="alert-circle-outline" size={30} color={colors.danger} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button title="Retry" onPress={onRetry} style={{ marginTop: spacing.lg }} />
      ) : null}
    </View>
  );
}

type BannerTone = 'info' | 'warning' | 'error' | 'success';

const TONE_MAP: Record<BannerTone, { bg: string; text: string; icon: IoniconName }> = {
  info: { bg: colors.infoSoft, text: colors.info, icon: 'information-circle-outline' },
  warning: { bg: colors.warningSoft, text: colors.warning, icon: 'alert-circle-outline' },
  error: { bg: colors.dangerSoft, text: colors.danger, icon: 'close-circle-outline' },
  success: { bg: colors.successSoft, text: colors.success, icon: 'checkmark-circle-outline' }
};

export function InfoBanner({ message, tone = 'info' }: { message: string; tone?: BannerTone }): JSX.Element {
  const toneStyle = TONE_MAP[tone];
  return (
    <View style={[styles.banner, { backgroundColor: toneStyle.bg }]}>
      <Ionicons name={toneStyle.icon} size={20} color={toneStyle.text} />
      <Text style={[styles.bannerText, { color: toneStyle.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    flexGrow: 1
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center'
  },
  message: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18
  }
});