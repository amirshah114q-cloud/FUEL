import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenHeader } from '../../components/Screen';
import { FuelEntryCard } from '../../components/FuelEntryCard';
import { EmptyState, ErrorState } from '../../components/Feedback';
import { FilterChip } from '../../components/FilterChip';
import { FuelFilterModal } from '../../components/FuelFilterModal';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, getFuelEntries } from '../../services/fuelService';
import { listDrivers } from '../../services/driverService';
import { listVehicles } from '../../services/vehicleService';
import { DriverDTO, FuelEntry, PaginationMeta, VehicleDTO } from '../../types/models';
import { FuelFilterState } from '../../types/filters';
import { OfficeTabsParamList, RootStackParamList } from '../../types/navigation';
import {
  activeFilterCount,
  cloneFilter,
  defaultFuelFilter,
  fuelFilterToQuery,
  periodLabel
} from '../../utils/filters';
import { currentMonth, shiftMonth } from '../../utils/format';
import { colors, radius, spacing } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<OfficeTabsParamList, 'Records'>,
  NativeStackScreenProps<RootStackParamList>
>;

const PAGE_SIZE = 20;

export default function FuelRecordsScreen({ navigation, route }: Props): JSX.Element {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FuelFilterState>(defaultFuelFilter);
  const [filterVisible, setFilterVisible] = useState(false);
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search: 400 ms after the last keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const query = useMemo(() => fuelFilterToQuery(filter, appliedSearch), [filter, appliedSearch]);

  const load = useCallback(
    async (pageToLoad: number): Promise<void> => {
      if (pageToLoad === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const result = await getFuelEntries({ ...query, page: pageToLoad, limit: PAGE_SIZE });
        setEntries((prev) => (pageToLoad === 1 ? result.entries : [...prev, ...result.entries]));
        setMeta(result.meta);
        setPage(pageToLoad);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  // Consume a filter handed over from the Dashboard (tap-through analytics).
  useFocusEffect(
    useCallback(() => {
      const pending = route.params?.pendingFilter;
      if (pending) {
        navigation.setParams({ pendingFilter: undefined });
        setFilter(cloneFilter(pending));
      }
    }, [route.params, navigation])
  );

  const loadMore = (): void => {
    if (meta?.hasNextPage && !loading && !loadingMore) load(page + 1);
  };

  const pullRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await load(1);
    setRefreshing(false);
  };

  const openFilters = async (): Promise<void> => {
    setFilterVisible(true);
    if (!optionsLoaded) {
      setOptionsLoading(true);
      try {
        const [driverList, vehicleList] = await Promise.all([
          listDrivers({ limit: 100 }),
          listVehicles({ limit: 100 })
        ]);
        setDrivers(driverList);
        setVehicles(vehicleList);
        setOptionsLoaded(true);
      } catch (err) {
        Alert.alert(
          'Could not load filter options',
          getErrorMessage(err) + ' You can still filter by date, fuel type and status.'
        );
      } finally {
        setOptionsLoading(false);
      }
    }
  };

  const isMonthPeriod = filter.period.type === 'month';
  const periodMonth = isMonthPeriod ? filter.period.month : null;

  const shiftPeriodMonth = (delta: number): void => {
    setFilter((f) =>
      f.period.type === 'month'
        ? { ...f, period: { type: 'month', month: shiftMonth(f.period.month, delta) } }
        : f
    );
  };

  const activeCount = activeFilterCount(filter);

  // Removable chips for every active (non-period) filter.
  const chips: Array<{ key: string; label: string; remove: () => void }> = [];
  if (filter.driverId) {
    chips.push({
      key: 'driver',
      label: `Driver: ${filter.driverLabel ?? filter.driverId}`,
      remove: () => setFilter((f) => ({ ...f, driverId: undefined, driverLabel: undefined }))
    });
  }
  if (filter.vehicleId) {
    chips.push({
      key: 'vehicle',
      label: `Vehicle: ${filter.vehicleLabel ?? filter.vehicleId}`,
      remove: () => setFilter((f) => ({ ...f, vehicleId: undefined, vehicleLabel: undefined }))
    });
  }
  if (filter.fuelType) {
    chips.push({
      key: 'fuelType',
      label: filter.fuelType,
      remove: () => setFilter((f) => ({ ...f, fuelType: undefined }))
    });
  }
  if (filter.status) {
    chips.push({
      key: 'status',
      label: filter.status.charAt(0).toUpperCase() + filter.status.slice(1),
      remove: () => setFilter((f) => ({ ...f, status: undefined }))
    });
  }
  if (filter.receiptNumber?.trim()) {
    chips.push({
      key: 'receipt',
      label: `Receipt: ${filter.receiptNumber.trim()}`,
      remove: () => setFilter((f) => ({ ...f, receiptNumber: undefined }))
    });
  }
  if (filter.vehicleNumber?.trim()) {
    chips.push({
      key: 'vehicleNumber',
      label: `Vehicle No: ${filter.vehicleNumber.trim()}`,
      remove: () => setFilter((f) => ({ ...f, vehicleNumber: undefined }))
    });
  }
  if (appliedSearch) {
    chips.push({
      key: 'search',
      label: `Search: "${appliedSearch}"`,
      remove: () => setSearchText('')
    });
  }

  return (
    <Screen scroll={false}>
      <ScreenHeader
        title="Fuel Records"
        subtitle={`${user?.name ?? ''} • ${user?.role === 'admin' ? 'Administrator' : 'Accountant'}`}
        back={false}
      />

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search pump, receipt or vehicle…"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 ? (
          <Ionicons name="close" size={18} color={colors.muted} onPress={() => setSearchText('')} />
        ) : null}
      </View>

      <View style={styles.controlsRow}>
        {isMonthPeriod ? (
          <Text style={styles.monthArrow} onPress={() => shiftPeriodMonth(-1)}>
            ‹
          </Text>
        ) : null}
        <Text style={styles.periodText}>{periodLabel(filter)}</Text>
        {isMonthPeriod ? (
          <Text
            style={[styles.monthArrow, periodMonth === currentMonth() && { opacity: 0.3 }]}
            onPress={() => {
              if (periodMonth !== currentMonth()) shiftPeriodMonth(1);
            }}
          >
            ›
          </Text>
        ) : null}
        <Pressable
          style={[styles.filterButton, activeCount > 0 && styles.filterButtonActive]}
          onPress={openFilters}
        >
          <Ionicons
            name="funnel-outline"
            size={18}
            color={activeCount > 0 ? colors.white : colors.primary}
          />
          {activeCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {chips.length > 0 ? (
        <View style={styles.chipsRow}>
          {chips.map((chip) => (
            <FilterChip key={chip.key} label={chip.label} onRemove={chip.remove} />
          ))}
          <Text
            style={styles.clearAll}
            onPress={() =>
              setFilter((f) => ({
                ...defaultFuelFilter(),
                period: f.period
              }))
            }
          >
            Clear filters
          </Text>
        </View>
      ) : null}

      {meta ? (
        <Text style={styles.countLabel}>
          {meta.totalItems} {meta.totalItems === 1 ? 'entry' : 'entries'}
        </Text>
      ) : null}

      <FlatList<FuelEntry>
        data={entries}
        keyExtractor={(entry) => entry.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={pullRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <FuelEntryCard
            entry={item}
            showDriver
            onPress={() => navigation.navigate('EntryDetail', { entryId: item.id })}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerFill}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <ErrorState message={error} onRetry={() => load(1)} />
          ) : (
            <EmptyState
              title="No fuel records found"
              message={
                chips.length > 0
                  ? 'No entries match the current filters. Try widening the period or clearing filters.'
                  : 'No entries were recorded for this period.'
              }
              actionLabel={chips.length > 0 ? 'Clear filters' : undefined}
              onAction={
                chips.length > 0
                  ? () => setFilter((f) => ({ ...defaultFuelFilter(), period: f.period }))
                  : undefined
              }
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.footerText}>Loading more…</Text>
            </View>
          ) : null
        }
      />

      <FuelFilterModal
        visible={filterVisible}
        filter={filter}
        drivers={drivers}
        vehicles={vehicles}
        optionsLoading={optionsLoading}
        onApply={(newFilter) => {
          setFilter(newFilter);
          setFilterVisible(false);
        }}
        onClose={() => setFilterVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    fontSize: 14,
    color: colors.text
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm
  },
  monthArrow: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary
  },
  periodText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  filterButtonActive: {
    backgroundColor: colors.primary
  },
  filterBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md
  },
  clearAll: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.danger,
    paddingHorizontal: 6
  },
  countLabel: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.md
  },
  listContent: {
    flexGrow: 1
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: spacing.lg
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary
  }
});