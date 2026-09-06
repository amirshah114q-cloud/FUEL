import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FuelType } from '../types/models';
import { colors, radius, spacing } from '../theme';

interface FuelTypeSelectorProps {
  value: FuelType | '';
  onChange: (value: FuelType) => void;
  error?: string;
}

export function FuelTypeSelector({ value, onChange, error }: FuelTypeSelectorProps): JSX.Element {
  const borderColor = error && !value ? colors.danger : colors.border;
  return (
    <View>
      <Text style={styles.label}>Fuel Type</Text>
      <View style={styles.row}>
        {(['Petrol', 'Diesel'] as FuelType[]).map((type) => {
          const active = value === type;
          return (
            <Pressable
              key={type}
              onPress={() => onChange(type)}
              style={[styles.option, { borderColor: active ? colors.primary : borderColor }, active && styles.active]}
            >
              <Ionicons
                name={type === 'Diesel' ? 'water-outline' : 'flash-outline'}
                size={17}
                color={active ? colors.white : colors.primary}
              />
              <Text style={[styles.optionText, active && styles.activeText]}>{type}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md
  },
  option: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  active: {
    backgroundColor: colors.primary
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary
  },
  activeText: {
    color: colors.white
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4
  }
});