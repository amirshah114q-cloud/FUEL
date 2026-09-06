import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Card, StatCard } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/Loading';
import { EmptyState, ErrorState, InfoBanner } from '../../components/Feedback';
import { FuelEntryCard } from '../../components/FuelEntryCard';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, getFuelEntries } from '../../services/fuelService';
import { FuelEntry } from '../../types/models';
import { DriverTabsParamList, RootStackParamList } from '../../types/navigation';
import { currentMonth, formatLiters, formatMoney, monthLabel, round2 } from '../../utils/format';
import { colors, radius, spacing } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<DriverTabsParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function DriverHomeScreen({ navigation }: Props): JSX.Element {
  const { user, driverProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<FuelEntry[]>([]);
  const [stats, setStats] = useState({ count: 0, liters: 0, amount: 0 });
  const [month, setMonth] = useState(currentMonth());

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const current = currentMonth();
      setMonth(current);
      const [recentResult, monthResult] = await Promise.all([
        getFuelEntries({ limit: 5 }),
        getFuelEntries({ month: current, limit: 100 })
      ]);
      setRecent(recentResult.entries);
      setStats({
        count: monthResult.meta.totalItems,
        liters: round2(monthResult.entries.reduce((sum, e) => sum + e.liters, 0)),
        amount: round2(monthResult.entries.reduce((sum, e) => sum + e.totalAmount, 0))
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload on every focus so newly uploaded entries appear immediately.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const firstName = (user?.name ?? 'Driver').split(' ')[0];
  const vehicle = driverProfile?.vehicle ?? null;

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <ScreenHeader
        title={`Hello, ${firstName}`}
        subtitle={monthLabel(month)}
        back={false}
        right={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
          </View>
        }
      />

      {vehicle ? (
        <Card style={styles.vehicleCard}>
          <View style={styles.vehicleIcon}>
            <Ionicons name="car-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleNumber}>{vehicle.vehicleNumber}</Text>
            <Text style={styles.vehicleModel}>
              {vehicle.vehicleType} • {vehicle.model}
            </Text>
          </View>
        </Card>
      ) : (
        <InfoBanner
          message="No vehicle is assigned to you yet. Please contact the office before recording fuel entries."
          tone="warning"
        />
      )}

      <View style={styles.statsRow}>
        <StatCard label="Entries" value={String(stats.count)} icon="receipt-outline" />
        <StatCard label="Liters" value={formatLiters(stats.liters)} icon="water-outline" tone="accent" />
        <StatCard label="Spent" value={formatMoney(stats.amount)} icon="cash-outline" tone="success" />
      </View>
      <Text style={styles.statsCaption}>Your fuel usage this month</Text>

      <Button
        title="Upload Fuel Slip"
        onPress={() => navigation.navigate('UploadSlip')}
        icon={<Ionicons name="camera-outline" size={20} color={colors.white} />}
        style={styles.cta}
      />

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Recent Entries</Text>
        <Text style={styles.viewAll} onPress={() => navigation.navigate('MyEntries')}>
          View all
        </Text>
      </View>

      {loading && recent.length === 0 ? (
        <LoadingSpinner label="Loading your entries…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : recent.length === 0 ? (
        <EmptyState
          title="No fuel entries yet"
          message="Photograph your first fuel slip and it will appear here."
          actionLabel="Upload a slip"
          onAction={() => navigation.navigate('UploadSlip')}
        />
      ) : (
        recent.map((entry) => (
          <FuelEntryCard
            key={entry.id}
            entry={entry}
            onPress={() => navigation.navigate('EntryDetail', { entryId: entry.id })}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  vehicleIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  vehicleInfo: {
    flex: 1
  },
  vehicleNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text
  },
  vehicleModel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md
  },
  statsCaption: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: spacing.lg
  },
  cta: {
    marginBottom: spacing.xl
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary
  }
});