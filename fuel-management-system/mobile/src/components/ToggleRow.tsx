import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

interface ToggleRowProps {
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({ label, sublabel, value, onValueChange, disabled = false }: ToggleRowProps): JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onValueChange}
        disabled={disabled}
        trackColor={{ false: '#CBD5E1', true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg
  },
  texts: {
    flex: 1,
    marginRight: spacing.md
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  sublabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  }
});