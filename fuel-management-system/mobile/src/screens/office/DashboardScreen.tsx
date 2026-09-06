import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Card, StatCard } from '../../components/Card';
import { ChipGroup } from '../../components/ChipGroup';
import { InfoBanner, ErrorState } from '../../components/Feedback';
import { LoadingSpinner } from '../../components/Loading';
import { BarChart } from '../../components/charts/BarChart';
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart';
import { useAuth } from '../../context/AuthContext';
import {
  getDailyUsage,
  getDashboardSummary,
  getDriverExpenses,
  getMonthlyTrend,
  getVehicleExpenses
} from '../../services/dashboardService';
import { getErrorMessage } from '../../services/fuelService';
import {
  DailyUsagePoint,
  DashboardSummary,
  DriverExpenseItem,
  MonthlyTrendPoint,
  VehicleExpenseItem
} from '../../types/models';
import { OfficeTabsParamList, RootStackParamList } from '../../types/navigation';
import {
  compactMoney,
  compactNumber,
  currentMonth,
  formatLiters,
  formatMoney,
  monthLabel,
  monthShortLabel,
  shiftMonth
} from '../../utils/format';
import { colors, spacing } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<OfficeTabsParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

type TrendMetric = 'amount' | 'liters';

interface Delta {
  text: string;
  color: string;
}

function delta(current: number, previous: number): Delta | null {
  if (previous > 0) {
    const pct = ((current - previous) / previous) * 100;
    const up = pct >= 0;
    return {
      text: `${up ? '▲' : '▼'} ${Math.abs(Math.round(pct))}%`,
      color: up ? colors.success : colors.danger
    };
  }
  if (current > 0) return { text: 'NEW', color: colors.success };
  return null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  accountant: 'Accountant'
};

export default function DashboardScreen({ navigation }: Props): JSX.Element {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [metric, setMetric] = useState<TrendMetric>('amount');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<MonthlyTrendPoint[]>([]);
  const [daily, setDaily] = useState<DailyUsagePoint[]>([]);
  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpenseItem[]>([]);
  const [driverExpenses, setDriverExpenses] = useState<DriverExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [summaryData, trendData, dailyData, vehicleData, driverData] = await Promise.all([
          getDashboardSummary(month),
          getMonthlyTrend(12),
          getDailyUsage(month),
          getVehicleExpenses(month),
          getDriverExpenses(month)
        ]);
        setSummary(summaryData);
        setTrend(trendData);
        setDaily(dailyData);
        setVehicleExpenses(vehicleData);
        setDriverExpenses(driverData);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Refresh when returning to this tab (after data changes elsewhere).
  useFocusEffect(
    useCallback(() => {
      if (loadedOnce.current) load(true);
      loadedOnce.current = true;
    }, [load])
  );

  const openRecordsForVehicle = (vehicleId: string, vehicleNumber: string): void => {
    navigation.navigate('Records', {
      pendingFilter: { period: { type: 'month', month }, vehicleId, vehicleLabel: vehicleNumber }
    });
  };

  const openRecordsForDriver = (driverId: string, driverName: string): void => {
    navigation.navigate('Records', {
      pendingFilter: { period: { type: 'month', month }, driverId, driverLabel: driverName }
    });
  };

  const litersDelta = summary ? delta(summary.totalLiters, summary.previousMonth.totalLiters) : null;
  const amountDelta = summary ? delta(summary.totalAmount, summary.previousMonth.totalAmount) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <ScreenHeader
        title="Dashboard"
        subtitle={ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''}
        back={false}
      />

      {/* Month selector */}
      <View style={styles.monthRow}>
        <Text
          style={styles.monthArrow}
          onPress={() => setMonth((m) => shiftMonth(m, -1))}
        >
          ‹
        </Text>
        <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
        <Text
          style={[styles.monthArrow, month === currentMonth() && { opacity: 0.3 }]}
          onPress={() => {
            if (month !== currentMonth()) setMonth((m) => shiftMonth(m, 1));
          }}
        >
          ›
        </Text>
      </View>

      {loading && !summary ? (
        <LoadingSpinner label="Loading dashboard…" />
      ) : error && !summary ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <>
          {error ? <InfoBanner message={error} tone="warning" /> : null}
          {summary ? (
            summary.entryCount === 0 ? (
              <InfoBanner
                message={`No fuel entries recorded for ${monthLabel(month)} yet.`}
                tone="info"
              />
            ) : null
          ) : null}

          {summary ? (
            <>
              <View style={styles.statsRow}>
                <StatCard
                  label="Fuel Used"
                  value={formatLiters(summary.totalLiters)}
                  icon="water-outline"
                  tone="accent"
                />
                <StatCard
                  label="Total Expense"
                  value={formatMoney(summary.totalAmount)}
                  icon="cash-outline"
                  tone="primary"
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard label="Entries" value={String(summary.entryCount)} icon="receipt-outline" />
                <StatCard
                  label="Avg / Entry"
                  value={formatMoney(summary.averageAmountPerEntry)}
                  icon="trending-up-outline"
                  tone="success"
                />
              </View>
              <Text style={styles.deltaLine}>
                <Text style={{ color: litersDelta?.color ?? colors.muted }}>
                  {litersDelta ? `${litersDelta.text} fuel` : 'No prior fuel data'}
                </Text>
                <Text style={styles.deltaSeparator}> • </Text>
                <Text style={{ color: amountDelta?.color ?? colors.muted }}>
                  {amountDelta ? `${amountDelta.text} expense` : 'No prior expense data'}
                </Text>
                <Text style={styles.deltaSeparator}> • vs </Text>
                <Text style={styles.deltaMuted}>{monthShortLabel(summary.previousMonth.month)}</Text>
              </Text>
              <Text style={styles.fleetLine}>
                {summary.activeDrivers} active drivers • {summary.activeVehicles} vehicles in service
              </Text>
            </>
          ) : null}

          {/* Monthly trend */}
          <Card style={styles.chartCard}>
            <View style={styles.chartHeaderRow}>
              <View style={styles.chartHeaderTexts}>
                <Text style={styles.cardTitle}>Monthly Trend</Text>
                <Text style={styles.cardSubtitle}>Last 12 months — tap a bar to select that month</Text>
              </View>
              <ChipGroup<TrendMetric>
                options={[
                  { value: 'amount', label: 'Expense' },
                  { value: 'liters', label: 'Liters' }
                ]}
                value={metric}
                onSelect={(v) => v && setMetric(v)}
                allowDeselect={false}
              />
            </View>
            <BarChart
              data={trend.map((p) => ({
                key: p.month,
                label: monthShortLabel(p.month),
                value: metric === 'amount' ? p.amount : p.liters
              }))}
              selectedKey={month}
              onBarPress={(d) => setMonth(d.key)}
              formatValue={metric === 'amount' ? compactMoney : (v) => `${compactNumber(v)} L`}
              height={150}
            />
          </Card>

          {/* Daily usage */}
          <Card style={styles.chartCard}>
            <Text style={styles.cardTitle}>Daily Fuel Usage</Text>
            <Text style={styles.cardSubtitle}>{monthLabel(month)} — liters per day</Text>
            <BarChart
              data={daily.map((d) => ({ key: d.date, label: String(d.day), value: d.liters }))}
              labelEvery={5}
              formatValue={(v) => `${compactNumber(v)} L`}
              height={130}
            />
          </Card>

          {/* Fuel type split */}
          {summary && summary.byFuelType.length > 0 ? (
            <Card style={styles.chartCard}>
              <Text style={styles.cardTitle}>Fuel Type Split</Text>
              <Text style={styles.cardSubtitle}>{monthLabel(month)} — liters by fuel type</Text>
              <HorizontalBarChart
                data={summary.byFuelType.map((f) => ({
                  key: f.fuelType,
                  label: f.fuelType,
                  sublabel: `${f.entries} ${f.entries === 1 ? 'entry' : 'entries'}`,
                  value: f.liters
                }))}
                formatValue={(v) => `${compactNumber(v)} L`}
              />
            </Card>
          ) : null}

          {/* Vehicle expenses */}
          <Card style={styles.chartCard}>
            <Text style={styles.cardTitle}>Vehicle Expenses</Text>
            <Text style={styles.cardSubtitle}>{monthLabel(month)} — tap a vehicle to view its records</Text>
            <HorizontalBarChart
              data={vehicleExpenses.slice(0, 10).map((v) => ({
                key: v.vehicleId,
                label: v.vehicleNumber,
                sublabel: `${v.entries} ${v.entries === 1 ? 'entry' : 'entries'}${v.isActive ? '' : ' • inactive'}`,
                value: v.amount
              }))}
              formatValue={compactMoney}
              onPress={(d) => openRecordsForVehicle(d.key, d.label)}
            />
          </Card>

          {/* Driver expenses */}
          <Card style={styles.chartCard}>
            <Text style={styles.cardTitle}>Driver Expenses</Text>
            <Text style={styles.cardSubtitle}>{monthLabel(month)} — tap a driver to view their records</Text>
            <HorizontalBarChart
              data={driverExpenses.slice(0, 10).map((d) => ({
                key: d.driverId,
                label: d.driverName,
                sublabel: `${d.employeeId} • ${d.entries} ${d.entries === 1 ? 'entry' : 'entries'}${d.isActive ? '' : ' • inactive'}`,
                value: d.amount
              }))}
              formatValue={compactMoney}
              onPress={(d) => openRecordsForDriver(d.key, d.label)}
            />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg
  },
  monthArrow: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    paddingHorizontal: spacing.sm
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md
  },
  deltaLine: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4
  },
  deltaSeparator: {
    color: colors.muted
  },
  deltaMuted: {
    color: colors.muted,
    fontWeight: '600'
  },
  fleetLine: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg
  },
  chartCard: {
    marginBottom: spacing.lg
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  chartHeaderTexts: {
    flex: 1,
    marginRight: spacing.md
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md
  }
});