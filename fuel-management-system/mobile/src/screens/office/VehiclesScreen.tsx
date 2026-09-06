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
import { listVehicles } from '../../services/vehicleService';
import { getErrorMessage } from '../../services/fuelService';
import { VehicleDTO } from '../../types/models';
import { OfficeTabsParamList, RootStackParamList } from '../../types/navigation';
import { colors, radius, spacing } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<OfficeTabsParamList, 'Vehicles'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function VehiclesScreen({ navigation }: Props): JSX.Element {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([]);
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
      setVehicles(await listVehicles({ search: appliedSearch || undefined, limit: 100 }));
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
        title="Vehicles"
        subtitle={isAdmin ? 'Manage the fleet' : 'Fleet directory'}
        back={false}
      />

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search number, type or model…"
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
          title="Add Vehicle"
          onPress={() => navigation.navigate('VehicleForm', {})}
          icon={<Ionicons name="add" size={20} color={colors.white} />}
          style={styles.addButton}
        />
      ) : null}

      <FlatList<VehicleDTO>
        data={vehicles}
        keyExtractor={(vehicle) => vehicle.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <VehicleRow
            vehicle={item}
            onPress={() => navigation.navigate('VehicleForm', { vehicleId: item.id })}
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
              icon="car-outline"
              title="No vehicles found"
              message={
                appliedSearch
                  ? 'No vehicles match your search.'
                  : isAdmin
                    ? 'Add your first vehicle to get started.'
                    : 'No vehicles have been added yet.'
              }
            />
          )
        }
      />
    </Screen>
  );
}

function VehicleRow({ vehicle, onPress }: { vehicle: VehicleDTO; onPress: () => void }): JSX.Element {
  return (
    <View style={styles.rowCard}>
      <View style={styles.iconWrap}>
        <Ionicons name="car-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.number}>{vehicle.vehicleNumber}</Text>
        <Text style={styles.sub}>
          {vehicle.vehicleType} • {vehicle.model}
        </Text>
        <View style={styles.metaRow}>
          {vehicle.assignedDriver ? (
            <View style={styles.driverChip}>
              <Ionicons name="person-outline" size={11} color={colors.primary} />
              <Text style={styles.driverChipText}>{vehicle.assignedDriver.name}</Text>
            </View>
          ) : (
            <Text style={styles.noDriver}>No driver assigned</Text>
          )}
          {!vehicle.isActive ? <View style={styles.inactiveDot} /> : null}
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
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  info: {
    flex: 1,
    marginRight: spacing.sm
  },
  number: {
    fontSize: 15,
    fontWeight: '800',
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
  driverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  driverChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary
  },
  noDriver: {
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