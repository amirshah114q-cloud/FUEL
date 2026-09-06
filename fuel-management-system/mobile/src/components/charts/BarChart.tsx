import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  barColor?: string;
  selectedKey?: string | null;
  onBarPress?: (datum: BarDatum) => void;
  /** Formats the value label shown above the selected bar. */
  formatValue?: (value: number) => string;
  /** Show a label under every Nth bar (auto-calculated when omitted). */
  labelEvery?: number;
}

/**
 * Vertical bar chart built with pure React Native Views — no chart library,
 * works everywhere including Expo Go. Tapping a bar reports via onBarPress.
 */
export function BarChart({
  data,
  height = 150,
  barColor = '#8FB3D9',
  selectedKey = null,
  onBarPress,
  formatValue,
  labelEvery
}: BarChartProps): JSX.Element {
  const max = Math.max(1, ...data.map((d) => d.value));
  const skip = labelEvery ?? Math.max(1, Math.ceil(data.length / 12));
  const hasAnyValue = data.some((d) => d.value > 0);

  if (!hasAnyValue) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No data for this period.</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.chartArea, { height }]}>
        {data.map((datum) => {
          const pct = datum.value > 0 ? Math.max(3, (datum.value / max) * 100) : 0;
          const selected = selectedKey === datum.key;
          return (
            <Pressable
              key={datum.key}
              onPress={() => onBarPress?.(datum)}
              style={styles.column}
            >
              {selected && datum.value > 0 && formatValue ? (
                <Text
                  style={styles.valueLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.55}
                >
                  {formatValue(datum.value)}
                </Text>
              ) : null}
              <View
                style={[
                  styles.bar,
                  {
                    height: `${pct}%`,
                    backgroundColor: selected ? colors.primary : barColor
                  }
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.baseline} />
      <View style={styles.labelsRow}>
        {data.map((datum, index) => (
          <Text
            key={datum.key}
            style={[styles.barLabel, index % skip !== 0 && styles.barLabelHidden]}
          >
            {datum.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end'
  },
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 1
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 3,
    maxWidth: '100%'
  },
  bar: {
    width: '68%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3
  },
  baseline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 4
  },
  barLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '600',
    color: colors.muted
  },
  barLabelHidden: {
    opacity: 0
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPad()
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted
  }
});

function spacingPad(): number {
  return 24;
}