import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Card } from '../../components/Card';
import { UploadOptionCard } from '../../components/UploadOptionCard';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { APP_VERSION } from '../../config';
import { OfficeTabsParamList, RootStackParamList } from '../../types/navigation';
import { colors, spacing } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<OfficeTabsParamList, 'More'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function MoreScreen({ navigation }: Props): JSX.Element {
  const { user, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <Screen>
      <ScreenHeader title="More" subtitle={user?.name ?? ''} back={false} />

      <UploadOptionCard
        icon="person-outline"
        title="Profile & Settings"
        subtitle="View your account details and log out"
        onPress={() => navigation.navigate('Profile')}
      />

      {user?.role === 'admin' ? (
        <UploadOptionCard
          icon="people-outline"
          title="User Management"
          subtitle="Create and manage admin, accountant and driver accounts"
          onPress={() => navigation.navigate('Users')}
        />
      ) : null}

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>Application</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>{APP_VERSION}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>{user?.role ?? '—'}</Text>
        </View>
      </Card>

      <Button
        title="Log Out"
        variant="secondary"
        onPress={() => setConfirmLogout(true)}
        style={{ marginTop: spacing.lg }}
      />

      <ConfirmDialog
        visible={confirmLogout}
        title="Log out?"
        message="You will need to enter your email and password to sign in again."
        confirmLabel="Log Out"
        destructive
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    marginTop: spacing.lg
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize'
  }
});