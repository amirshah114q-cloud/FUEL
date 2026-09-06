import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  options: ChipOption<T>[];
  value: T | null;
  onSelect: (value: T | null) => void;
  /** When true, tapping the active chip clears the selection. */
  allowDeselect?: boolean;
}

export function ChipGroup<T extends string>({
  options,
  value,
  onSelect,
  allowDeselect = true
}: ChipGroupProps<T>): JSX.Element {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (active) {
                if (allowDeselect) onSelect(null);
              } else {
                onSelect(option.value);
              }
            }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary
  },
  chipTextActive: {
    color: colors.white
  }
});