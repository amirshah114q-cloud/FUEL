import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FuelEntry } from '../types/models';
import { colors, radius, spacing } from '../theme';
import { dayMonth, formatLiters, formatMoney } from '../utils/format';
import { StatusChip } from './StatusChip';

interface FuelEntryCardProps {
  entry: FuelEntry;
  onPress?: (entry: FuelEntry) => void;
  /** Office roles see the driver's name; drivers see their vehicle. */
  showDriver?: boolean;
}

export function FuelEntryCard({ entry, onPress, showDriver = false }: FuelEntryCardProps): JSX.Element {
  const { day, month } = dayMonth(entry.date);
  const subLine = showDriver
    ? `${entry.driver?.name ?? '—'} • ${entry.vehicle?.vehicleNumber ?? entry.vehicleNumber}`
    : `${entry.vehicleNumber} • ${entry.fuelType}`;

  return (
    <Pressable
      onPress={() => onPress?.(entry)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.dateBlock}>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMonth}>{month}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.pump} numberOfLines={1}>
          {entry.petrolPumpName}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subLine}
        </Text>
        <View style={styles.metaRow}>
          <StatusChip status={entry.status} />
          {entry.receiptNumber ? (
            <Text style={styles.receipt} numberOfLines={1}>
              #{entry.receiptNumber}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.amountBlock}>
        <Text style={styles.amount} adjustsFontSizeToFit numberOfLines={1}>
          {formatMoney(entry.totalAmount)}
        </Text>
        <Text style={styles.liters}>{formatLiters(entry.liters)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  dateBlock: {
    width: 52,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6
  },
  info: {
    flex: 1,
    marginRight: spacing.sm
  },
  pump: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  sub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6
  },
  receipt: {
    fontSize: 11,
    color: colors.muted,
    flex: 1
  },
  amountBlock: {
    alignItems: 'flex-end'
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary
  },
  liters: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  }
});