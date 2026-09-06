import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ToggleRow } from '../../components/ToggleRow';
import { ChipGroup } from '../../components/ChipGroup';
import { InfoBanner } from '../../components/Feedback';
import { LoadingOverlay } from '../../components/Loading';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { OptionPickerModal, PickerOption } from '../../components/OptionPickerModal';
import { createUser, deleteUser, updateUser, UserPayload } from '../../services/userService';
import { listDrivers } from '../../services/driverService';
import { getErrorMessage } from '../../services/fuelService';
import { ApiError } from '../../services/api';
import { DriverDTO, UserRole } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'UserForm'>;

const EMAIL_REGEX = /\S+@\S+\.\S+/;

export default function UserFormScreen({ route, navigation }: Props): JSX.Element {
  const userId = route.params?.userId;
  const isEdit = !!userId;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | ''>('driver');
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverLabel, setDriverLabel] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [driverPickerVisible, setDriverPickerVisible] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const driverList = await listDrivers({ isActive: true, limit: 100 });
        setDrivers(driverList);
        if (userId) {
          // Fetch the current user via the list endpoint (single-user GET is
          // not exposed; the office list is authoritative and small).
          const { listUsers } = await import('../services/userService');
          const all = await listUsers({ limit: 100 });
          const current = all.find((u) => u.id === userId);
          if (!current) throw new Error('User not found.');
          setName(current.name);
          setEmail(current.email);
          setPhone(current.phone);
          setRole(current.role);
          setIsActive(current.isActive);
          if (current.driverId) {
            const linked = driverList.find((d) => d.id === current.driverId);
            setDriverId(current.driverId);
            setDriverLabel(linked?.name ?? current.driverId);
          }
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const driverOptions: PickerOption[] = drivers.map((d) => ({
    id: d.id,
    label: d.name,
    sublabel: d.employeeId
  }));

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
    if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Please enter a valid email address.';
    if (!isEdit && password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (isEdit && password && password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!role) errors.role = 'Select a role.';
    if (role === 'driver' && !driverId) errors.driverId = 'Select the driver profile to link.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async (): Promise<void> => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: UserPayload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        role: role as UserRole,
        driverId: role === 'driver' ? driverId : undefined,
        isActive
      };
      if (password) payload.password = password;
      if (isEdit) await updateUser(userId!, payload);
      else await createUser(payload);
      navigation.goBack();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(err.errors as Record<string, string>);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (): Promise<void> => {
    setConfirmDelete(false);
    setDeleting(true);
    setError(null);
    try {
      await deleteUser(userId!);
      navigation.goBack();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={isEdit ? 'Edit User' : 'Add User'} />

      {error ? <InfoBanner message={error} tone="error" /> : null}

      <TextField
        label="Full Name"
        value={name}
        onChangeText={setName}
        error={fieldErrors.name}
        placeholder="e.g. Sana Malik"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="user@company.com"
      />
      <TextField
        label="Phone (optional)"
        value={phone}
        onChangeText={setPhone}
        error={fieldErrors.phone}
        keyboardType="phone-pad"
        placeholder="+92-300-1234567"
      />
      <TextField
        label={isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secureTextEntry
        placeholder="Minimum 8 characters"
      />

      <Text style={styles.sectionLabel}>Role</Text>
      <ChipGroup<UserRole>
        options={[
          { value: 'admin', label: 'Admin' },
          { value: 'accountant', label: 'Accountant' },
          { value: 'driver', label: 'Driver' }
        ]}
        value={role || null}
        onSelect={(v) => {
          setRole(v ?? '');
          if (v !== 'driver') {
            setDriverId(null);
            setDriverLabel(null);
          }
        }}
        allowDeselect={false}
      />
      {fieldErrors.role ? (
        <Text style={styles.fieldError}>{fieldErrors.role}</Text>
      ) : (
        <Text style={rolesHintStyle(role)}>
          {role === 'driver'
            ? 'Drivers can upload slips and view only their own entries.'
            : role === 'accountant'
              ? 'Accountants view all records, dashboards and reports — no user management.'
              : 'Admins have full access, including user and fleet management.'}
        </Text>
      )}

      {role === 'driver' ? (
        <>
          <Text style={styles.pickerLabel}>Linked Driver Profile</Text>
          <Pressable style={styles.selectorRow} onPress={() => setDriverPickerVisible(true)}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text style={[styles.selectorText, !driverLabel && { color: colors.muted }]} numberOfLines={1}>
              {driverLabel ?? 'Select driver profile…'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
          {fieldErrors.driverId ? <Text style={styles.fieldError}>{fieldErrors.driverId}</Text> : null}
          <Text style={styles.pickerHint}>
            One driver profile can be linked to only one login account.
          </Text>
        </>
      ) : null}

      <ToggleRow
        label="Account Active"
        sublabel="Deactivated accounts cannot log in"
        value={isActive}
        onValueChange={setIsActive}
      />

      <Button title={isEdit ? 'Save Changes' : 'Create User'} onPress={save} loading={saving} />
      {isEdit ? (
        <Button
          title="Delete User"
          variant="danger"
          onPress={() => setConfirmDelete(true)}
          loading={deleting}
          style={{ marginTop: spacing.md }}
        />
      ) : null}

      <LoadingOverlay visible={loading} label="Loading user…" />
      <LoadingOverlay visible={saving} label="Saving user…" />

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this user?"
        message="The account will be permanently removed. You cannot delete your own account or the last active administrator."
        confirmLabel="Delete"
        destructive
        onConfirm={performDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <OptionPickerModal
        visible={driverPickerVisible}
        title="Link Driver Profile"
        options={driverOptions}
        selectedId={driverId}
        onSelect={(option) => {
          setDriverId(option?.id ?? null);
          setDriverLabel(option?.label ?? null);
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.driverId;
            return next;
          });
        }}
        onClose={() => setDriverPickerVisible(false)}
      />
    </Screen>
  );
}

function rolesHintStyle(role: UserRole | ''): { fontSize: number; color: string; marginTop: number; marginBottom: number } {
  return {
    fontSize: 11,
    color: role ? colors.muted : colors.danger,
    marginTop: 6,
    marginBottom: spacing.lg
  };
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 6
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6
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
  pickerHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
    marginBottom: spacing.lg
  }
});