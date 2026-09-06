import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { TextField } from './TextField';
import { DatePickerField } from './DatePickerField';
import { ChipGroup } from './ChipGroup';
import { OptionPickerModal, PickerOption } from './OptionPickerModal';
import { DriverDTO, FuelType, VehicleDTO } from '../types/models';
import { EntryStatusFilter, FuelFilterState, PeriodFilter } from '../types/filters';
import { cloneFilter, defaultFuelFilter } from '../utils/filters';
import { currentMonth, firstDayOfMonthISO, monthLabel, shiftMonth, todayISO } from '../utils/format';
import { colors, radius, spacing } from '../theme';

interface FuelFilterModalProps {
  visible: boolean;
  filter: FuelFilterState;
  drivers: DriverDTO[];
  vehicles: VehicleDTO[];
  optionsLoading: boolean;
  onApply: (filter: FuelFilterState) => void;
  onClose: () => void;
}

type PeriodType = 'month' | 'range' | 'all';

export function FuelFilterModal({
  visible,
  filter,
  drivers,
  vehicles,
  optionsLoading,
  onApply,
  onClose
}: FuelFilterModalProps): JSX.Element {
  const [draft, setDraft] = useState<FuelFilterState>(filter);
  const [driverPickerVisible, setDriverPickerVisible] = useState(false);
  const [vehiclePickerVisible, setVehiclePickerVisible] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDraft(cloneFilter(filter));
      setRangeError(null);
    }
  }, [visible, filter]);

  const periodType: PeriodType = draft.period.type;
  const periodMonth = draft.period.type === 'month' ? draft.period.month : currentMonth();

  const setPeriod = (type: PeriodType): void => {
    let next: PeriodFilter;
    if (type === 'month') {
      next = { type: 'month', month: periodMonth };
    } else if (type === 'range') {
      next = { type: 'range', from: firstDayOfMonthISO(), to: todayISO() };
    } else {
      next = { type: 'all' };
    }
    setDraft((prev) => ({ ...prev, period: next }));
    setRangeError(null);
  };

  const setPeriodMonth = (month: string): void => {
    setDraft((prev) => ({ ...prev, period: { type: 'month', month } }));
  };

  const updateRange = (field: 'from' | 'to', iso: string): void => {
    setDraft((prev) =>
      prev.period.type === 'range' ? { ...prev, period: { ...prev.period, [field]: iso } } : prev
    );
    setRangeError(null);
  };

  const driverOptions: PickerOption[] = drivers.map((d) => ({
    id: d.id,
    label: d.name,
    sublabel: d.employeeId
  }));
  const vehicleOptions: PickerOption[] = vehicles.map((v) => ({
    id: v.id,
    label: v.vehicleNumber,
    sublabel: `${v.vehicleType} • ${v.model}`
  }));

  const apply = (): void => {
    if (draft.period.type === 'range') {
      if (!draft.period.from || !draft.period.to) {
        setRangeError('Please select both From and To dates.');
        return;
      }
      if (draft.period.from > draft.period.to) {
        setRangeError('"From" date must be on or before the "To" date.');
        return;
      }
    }
    setRangeError(null);
    onApply(draft);
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Filter Fuel Records</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>Period</Text>
            <ChipGroup<PeriodType>
              options={[
                { value: 'month', label: 'Month' },
                { value: 'range', label: 'Date Range' },
                { value: 'all', label: 'All Time' }
              ]}
              value={periodType}
              onSelect={(v) => v && setPeriod(v)}
              allowDeselect={false}
            />

            {draft.period.type === 'month' ? (
              <View style={styles.monthNavRow}>
                <Pressable
                  style={styles.monthArrow}
                  onPress={() => setPeriodMonth(shiftMonth(periodMonth, -1))}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.primary} />
                </Pressable>
                <Text style={styles.monthNavLabel}>{monthLabel(periodMonth)}</Text>
                <Pressable
                  style={[styles.monthArrow, periodMonth === currentMonth() && { opacity: 0.3 }]}
                  onPress={() => {
                    if (periodMonth !== currentMonth()) setPeriodMonth(shiftMonth(periodMonth, 1));
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </Pressable>
              </View>
            ) : null}

            {draft.period.type === 'range' ? (
              <View style={styles.rangeRow}>
                <View style={styles.rangeField}>
                  <DatePickerField
                    label="From"
                    value={draft.period.from}
                    onChange={(iso) => updateRange('from', iso)}
                  />
                </View>
                <View style={styles.rangeField}>
                  <DatePickerField
                    label="To"
                    value={draft.period.to}
                    onChange={(iso) => updateRange('to', iso)}
                  />
                </View>
              </View>
            ) : null}
            {rangeError ? <Text style={styles.rangeError}>{rangeError}</Text> : null}

            <Text style={styles.sectionLabel}>Driver</Text>
            <Pressable style={styles.selectorRow} onPress={() => setDriverPickerVisible(true)}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
              <Text style={[styles.selectorText, !draft.driverLabel && { color: colors.muted }]} numberOfLines={1}>
                {draft.driverLabel ?? 'All drivers'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>

            <Text style={styles.sectionLabel}>Vehicle</Text>
            <Pressable style={styles.selectorRow} onPress={() => setVehiclePickerVisible(true)}>
              <Ionicons name="car-outline" size={18} color={colors.primary} />
              <Text style={[styles.selectorText, !draft.vehicleLabel && { color: colors.muted }]} numberOfLines={1}>
                {draft.vehicleLabel ?? 'All vehicles'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>

            <Text style={styles.sectionLabel}>Fuel Type</Text>
            <ChipGroup<FuelType>
              options={[
                { value: 'Petrol', label: 'Petrol' },
                { value: 'Diesel', label: 'Diesel' }
              ]}
              value={draft.fuelType ?? null}
              onSelect={(v) => setDraft((prev) => ({ ...prev, fuelType: v ?? undefined }))}
            />

            <Text style={styles.sectionLabel}>Status</Text>
            <ChipGroup<EntryStatusFilter>
              options={[
                { value: 'verified', label: 'Verified' },
                { value: 'pending', label: 'Pending' },
                { value: 'rejected', label: 'Rejected' }
              ]}
              value={draft.status ?? null}
              onSelect={(v) => setDraft((prev) => ({ ...prev, status: v ?? undefined }))}
            />

            <TextField
              label="Receipt Number"
              value={draft.receiptNumber ?? ''}
              onChangeText={(t) => setDraft((prev) => ({ ...prev, receiptNumber: t }))}
              placeholder="e.g. RCP-90211"
              autoCapitalize="characters"
            />
            <TextField
              label="Vehicle Number"
              value={draft.vehicleNumber ?? ''}
              onChangeText={(t) => setDraft((prev) => ({ ...prev, vehicleNumber: t }))}
              placeholder="e.g. KHI-1234"
              autoCapitalize="characters"
            />

            <View style={styles.actionsRow}>
              <Button
                title="Reset"
                variant="secondary"
                onPress={() => setDraft(defaultFuelFilter())}
                style={{ flex: 1 }}
              />
              <Button title="Apply Filters" onPress={apply} style={{ flex: 2 }} />
            </View>
          </ScrollView>
        </View>
      </View>

      <OptionPickerModal
        visible={driverPickerVisible}
        title="Select Driver"
        options={driverOptions}
        selectedId={draft.driverId ?? null}
        loading={optionsLoading}
        includeClear
        clearLabel="All drivers"
        onSelect={(option) =>
          setDraft((prev) => ({
            ...prev,
            driverId: option?.id,
            driverLabel: option?.label
          }))
        }
        onClose={() => setDriverPickerVisible(false)}
      />
      <OptionPickerModal
        visible={vehiclePickerVisible}
        title="Select Vehicle"
        options={vehicleOptions}
        selectedId={draft.vehicleId ?? null}
        loading={optionsLoading}
        includeClear
        clearLabel="All vehicles"
        onSelect={(option) =>
          setDraft((prev) => ({
            ...prev,
            vehicleId: option?.id,
            vehicleLabel: option?.label
          }))
        }
        onClose={() => setVehiclePickerVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end'
  },
  backdropPress: {
    flex: 1
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
    paddingTop: spacing.lg
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text
  },
  scroll: {
    flexGrow: 1
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.md
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: 8
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  monthNavLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.text
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md
  },
  rangeField: {
    flex: 1
  },
  rangeError: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 6
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    color: colors.text
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg
  }
});