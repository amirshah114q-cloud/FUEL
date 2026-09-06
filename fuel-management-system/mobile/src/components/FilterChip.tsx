import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

/** Removable filter pill shown above the records list. */
export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }): JSX.Element {
  return (
    <Pressable style={styles.chip} onPress={onRemove}>
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="close" size={14} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    maxWidth: 160
  }
});