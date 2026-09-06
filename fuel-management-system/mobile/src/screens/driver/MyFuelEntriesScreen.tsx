import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenHeader } from '../../components/Screen';
import { FuelEntryCard } from '../../components/FuelEntryCard';
import { EmptyState, ErrorState } from '../../components/Feedback';
import { getErrorMessage, getFuelEntries } from '../../services/fuelService';
import { FuelEntry, PaginationMeta } from '../../types/models';
import { DriverTabsParamList, RootStackParamList } from '../../types/navigation';
import { currentMonth, monthLabel, shiftMonth } from '../../utils/format';
import { colors, radius, spacing } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<DriverTabsParamList, 'MyEntries'>,
  NativeStackScreenProps<RootStackParamList>
>;

const PAGE_SIZE = 20;

export default function MyFuelEntriesScreen({ navigation }: Props): JSX.Element {
  const [month, setMonth] = useState(currentMonth());
  const [allTime, setAllTime] = useState(false);
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (pageToLoad: number): Promise<void> => {
      if (pageToLoad === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const result = await getFuelEntries({
          ...(allTime ? {} : { month }),
          page: pageToLoad,
          limit: PAGE_SIZE
        });
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
    [month, allTime]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const loadMore = (): void => {
    if (meta?.hasNextPage && !loading && !loadingMore) {
      load(page + 1);
    }
  };

  const goPrevMonth = (): void => {
    setAllTime(false);
    setMonth((m) => shiftMonth(m, -1));
  };
  const goNextMonth = (): void => {
    setAllTime(false);
    setMonth((m) => (m === currentMonth() ? m : shiftMonth(m, 1)));
  };

  return (
    <Screen scroll={false}>
      <ScreenHeader title="My Fuel Entries" back={false} />

      <View style={styles.monthRow}>
        <Pressable style={styles.monthArrow} onPress={goPrevMonth} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={styles.monthLabel}>{allTime ? 'All time' : monthLabel(month)}</Text>
        <Pressable
          style={[styles.monthArrow, (allTime || month === currentMonth()) && { opacity: 0.3 }]}
          onPress={goNextMonth}
          hitSlop={8}
          disabled={allTime || month === currentMonth()}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
        <Pressable style={[styles.allButton, allTime && styles.allButtonActive]} onPress={() => setAllTime((v) => !v)}>
          <Text style={[styles.allButtonText, allTime && styles.allButtonTextActive]}>All</Text>
        </Pressable>
      </View>

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
        refreshControl={undefined}
        renderItem={({ item }) => (
          <FuelEntryCard
            entry={item}
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
              title="No fuel entries"
              message={allTime ? 'You have not recorded any fuel slips yet.' : 'No entries were recorded in this month.'}
              actionLabel="Upload a slip"
              onAction={() => navigation.navigate('UploadSlip')}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.text
  },
  allButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft
  },
  allButtonActive: {
    backgroundColor: colors.primary
  },
  allButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary
  },
  allButtonTextActive: {
    color: colors.white
  },
  countLabel: {
    fontSize: 12,
    color: colors.muted,
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