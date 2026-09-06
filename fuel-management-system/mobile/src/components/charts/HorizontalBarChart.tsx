import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';

export interface HBarDatum {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
}

interface HorizontalBarChartProps {
  data: HBarDatum[];
  formatValue: (value: number) => string;
  onPress?: (datum: HBarDatum) => void;
  barColor?: string;
  emptyMessage?: string;
}

/** Horizontal ranked bars — used for vehicle/driver expenses and fuel-type split. */
export function HorizontalBarChart({
  data,
  formatValue,
  onPress,
  barColor = '#8FB3D9',
  emptyMessage = 'No data for this period.'
}: HorizontalBarChartProps): JSX.Element {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <Text style={styles.emptyText}>{emptyMessage}</Text>;
  }

  return (
    <View>
      {data.map((datum) => {
        const pct = datum.value > 0 ? Math.max(2, (datum.value / max) * 100) : 0;
        const content = (
          <>
            <View style={styles.topRow}>
              <Text style={styles.label} numberOfLines={1}>
                {datum.label}
              </Text>
              <Text style={styles.value}>{formatValue(datum.value)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
            </View>
            {datum.sublabel ? <Text style={styles.sub}>{datum.sublabel}</Text> : null}
          </>
        );
        return onPress ? (
          <Pressable key={datum.key} style={styles.row} onPress={() => onPress(datum)}>
            {content}
          </Pressable>
        ) : (
          <View key={datum.key} style={styles.row}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.md
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm
  },
  value: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    borderRadius: 4
  },
  sub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 3
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.lg
  }
});