import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, radius, spacing } from '../theme';
import { formatDate } from '../utils/format';

interface DatePickerFieldProps {
  label: string;
  /** YYYY-MM-DD */
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  highlight?: boolean;
  maxDate?: Date;
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function DatePickerField({
  label,
  value,
  onChange,
  error,
  highlight,
  maxDate
}: DatePickerFieldProps): JSX.Element {
  const [show, setShow] = useState(false);
  const borderColor = error ? colors.danger : highlight ? colors.warning : colors.border;

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={[styles.field, { borderColor }]} onPress={() => setShow(true)}>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <Text style={[styles.value, !value && { color: colors.muted }]}>
          {value ? formatDate(value) : 'Tap to select date'}
        </Text>
      </Pressable>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : highlight ? (
        <Text style={styles.hint}>Not read from the slip — please select the date.</Text>
      ) : null}

      {show && (
        <DateTimePicker
          value={value ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          display="default"
          maximumDate={maxDate ?? new Date()}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShow(false);
            if (event.type === 'set' && date) {
              onChange(toISODate(date));
            }
          }}
        />
      )}
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
  field: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderRadius: radius.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  value: {
    fontSize: 15,
    color: colors.text
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4
  },
  hint: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4
  }
});