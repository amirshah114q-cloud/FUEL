import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import { listDrivers } from '../../services/driverService';
import { getErrorMessage } from '../../services/fuelService';
import { DriverDTO } from '../../types/models';
import { OfficeTabsParamList, RootStackParamList } from '../../types/navigation';
import { colors, radius, spacing } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<OfficeTabsParamList, 'Drivers'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function DriversScreen({ navigation }: Props): JSX.Element {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setDrivers(await listDrivers({ search: appliedSearch || undefined, limit: 100 }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (loadedOnce.current) load();
      loadedOnce.current = true;
    }, [load])
  );

  return (
    <Screen scroll={false}>
      <ScreenHeader
        title="Drivers"
        subtitle={isAdmin ? 'Manage driver profiles' : 'Driver directory'}
        back={false}
      />

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search name, phone or employee ID…"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 ? (
          <Ionicons name="close" size={18} color={colors.muted} onPress={() => setSearchText('')} />
        ) : null}
      </View>

      {isAdmin ? (
        <Button
          title="Add Driver"
          onPress={() => navigation.navigate('DriverForm', {})}
          icon={<Ionicons name="add" size={20} color={colors.white} />}
          style={styles.addButton}
        />
      ) : null}

      <FlatList<DriverDTO>
        data={drivers}
        keyExtractor={(driver) => driver.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <DriverRow
            driver={item}
            onPress={() => navigation.navigate('DriverForm', { driverId: item.id })}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerFill}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : (
            <EmptyState
              icon="people-outline"
              title="No drivers found"
              message={
                appliedSearch
                  ? 'No drivers match your search.'
                  : isAdmin
                    ? 'Add your first driver to get started.'
                    : 'No drivers have been added yet.'
              }
            />
          )
        }
      />
    </Screen>
  );
}

function DriverRow({ driver, onPress }: { driver: DriverDTO; onPress: () => void }): JSX.Element {
  const initials = driver.name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.rowCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{driver.name}</Text>
        <Text style={styles.sub}>
          {driver.employeeId} • {driver.phone}
        </Text>
        <View style={styles.metaRow}>
          {driver.assignedVehicle ? (
            <View style={styles.vehicleChip}>
              <Ionicons name="car-outline" size={11} color={colors.primary} />
              <Text style={styles.vehicleChipText}>{driver.assignedVehicle.vehicleNumber}</Text>
            </View>
          ) : (
            <Text style={styles.noVehicle}>No vehicle assigned</Text>
          )}
          {!driver.isActive ? <View style={styles.inactiveDot} /> : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </View>
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
  addButton: {
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
  rowCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary
  },
  info: {
    flex: 1,
    marginRight: spacing.sm
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  sub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  vehicleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary
  },
  noVehicle: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600'
  },
  inactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.muted
  }
});