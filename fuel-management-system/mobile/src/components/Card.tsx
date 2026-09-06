import React, { ComponentProps } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }): JSX.Element {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface StatCardProps {
  label: string;
  value: string;
  icon?: IoniconName;
  tone?: 'primary' | 'accent' | 'success';
}

export function StatCard({ label, value, icon, tone = 'primary' }: StatCardProps): JSX.Element {
  const toneColor = tone === 'accent' ? colors.accent : tone === 'success' ? colors.success : colors.primary;
  return (
    <View style={[styles.card, styles.statCard]}>
      <View style={styles.statTop}>
        {icon ? (
          <View style={[styles.iconChip, { backgroundColor: `${toneColor}1A` }]}>
            <Ionicons name={icon} size={15} color={toneColor} />
          </View>
        ) : null}
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.statValue, { color: toneColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg
  },
  statCard: {
    flex: 1,
    padding: spacing.md
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  iconChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6
  }
});