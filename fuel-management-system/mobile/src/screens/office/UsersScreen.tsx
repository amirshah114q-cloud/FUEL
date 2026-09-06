import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Button } from '../../components/Button';
import { ChipGroup } from '../../components/ChipGroup';
import { EmptyState, ErrorState } from '../../components/Feedback';
import { listUsers } from '../../services/userService';
import { getErrorMessage } from '../../services/fuelService';
import { SafeUser, UserRole } from '../../types/models';
import { OfficeTabsParamList, RootStackParamList } from '../../types/navigation';
import { colors, radius, spacing } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<OfficeTabsParamList, 'More'>,
  NativeStackScreenProps<RootStackParamList>
>;

type RoleFilter = 'all' | UserRole;

const ROLE_TONES: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: colors.primarySoft, text: colors.primary },
  accountant: { bg: colors.accentSoft, text: colors.accent },
  driver: { bg: colors.successSoft, text: colors.success }
};

export default function UsersScreen({ navigation }: Props): JSX.Element {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [users, setUsers] = useState<SafeUser[]>([]);
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
      setUsers(
        await listUsers({
          search: appliedSearch || undefined,
          role: roleFilter === 'all' ? undefined : roleFilter,
          limit: 100
        })
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, roleFilter]);

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
      <ScreenHeader title="User Management" subtitle="Admin accounts, accountants and drivers" />

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search name, email or phone…"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 ? (
          <Ionicons name="close" size={18} color={colors.muted} onPress={() => setSearchText('')} />
        ) : null}
      </View>

      <ChipGroup<RoleFilter>
        options={[
          { value: 'all', label: 'All' },
          { value: 'admin', label: 'Admins' },
          { value: 'accountant', label: 'Accountants' },
          { value: 'driver', label: 'Drivers' }
        ]}
        value={roleFilter}
        onSelect={(v) => setRoleFilter(v ?? 'all')}
        allowDeselect={false}
      />

      <Button
        title="Add User"
        onPress={() => navigation.navigate('UserForm', {})}
        icon={<Ionicons name="add" size={20} color={colors.white} />}
        style={styles.addButton}
      />

      <FlatList<SafeUser>
        data={users}
        keyExtractor={(user) => user.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <UserRow user={item} onPress={() => navigation.navigate('UserForm', { userId: item.id })} />
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
              title="No users found"
              message="No accounts match the current filters."
            />
          )
        }
      />
    </Screen>
  );
}

function UserRow({ user, onPress }: { user: SafeUser; onPress: () => void }): JSX.Element {
  const tone = ROLE_TONES[user.role];
  const initials = user.name
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
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {user.email}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.roleChip, { backgroundColor: tone.bg }]}>
            <Text style={[styles.roleText, { color: tone.text }]}>{user.role}</Text>
          </View>
          {!user.isActive ? (
            <View style={styles.inactiveChip}>
              <Text style={styles.inactiveText}>INACTIVE</Text>
            </View>
          ) : null}
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
    marginTop: spacing.md,
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
  email: {
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
  roleChip: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  inactiveChip: {
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  inactiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 0.4
  }
});