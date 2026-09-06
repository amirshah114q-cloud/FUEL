import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { APP_VERSION } from '../../config';
import { colors, radius, spacing } from '../../theme';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  accountant: 'Accountant',
  driver: 'Driver'
};

export default function ProfileScreen(): JSX.Element {
  const { user, driverProfile, logout } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Screen>
      <ScreenHeader title="Profile" back={false} />

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <View style={styles.roleChip}>
          <Text style={styles.roleText}>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="mail-outline" size={15} color={colors.muted} />
          <Text style={styles.contactText}>{user?.email}</Text>
        </View>
        {user?.phone ? (
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={15} color={colors.muted} />
            <Text style={styles.contactText}>{user.phone}</Text>
          </View>
        ) : null}
      </Card>

      {driverProfile ? (
        <Card style={styles.driverCard}>
          <Text style={styles.cardTitle}>Driver Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Employee ID</Text>
            <Text style={styles.detailValue}>{driverProfile.employeeId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{driverProfile.phone}</Text>
          </View>
          {driverProfile.vehicle ? (
            <View style={styles.vehicleBox}>
              <Ionicons name="car-outline" size={20} color={colors.primary} />
              <View style={styles.vehicleTexts}>
                <Text style={styles.vehicleNumber}>{driverProfile.vehicle.vehicleNumber}</Text>
                <Text style={styles.vehicleModel}>
                  {driverProfile.vehicle.vehicleType} • {driverProfile.vehicle.model}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noVehicle}>No vehicle assigned yet.</Text>
          )}
        </Card>
      ) : null}

      <Card style={styles.appCard}>
        <Text style={styles.cardTitle}>Application</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Version</Text>
          <Text style={styles.detailValue}>{APP_VERSION}</Text>
        </View>
      </Card>

      <Button
        title="Log Out"
        variant="danger"
        onPress={() => setConfirmVisible(true)}
        icon={<Ionicons name="log-out-outline" size={18} color={colors.white} />}
        style={{ marginTop: spacing.xl }}
      />

      <ConfirmDialog
        visible={confirmVisible}
        title="Log out?"
        message="You will need to enter your email and password to sign in again."
        confirmLabel="Log Out"
        destructive
        onConfirm={() => {
          setConfirmVisible(false);
          logout();
        }}
        onCancel={() => setConfirmVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text
  },
  roleChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6
  },
  roleText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8
  },
  contactText: {
    fontSize: 13,
    color: colors.textSecondary
  },
  driverCard: {
    marginBottom: spacing.lg
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  vehicleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm
  },
  vehicleTexts: {
    flex: 1
  },
  vehicleNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary
  },
  vehicleModel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  noVehicle: {
    fontSize: 13,
    color: colors.warning,
    marginTop: 6
  },
  appCard: {
    marginBottom: spacing.lg
  }
});