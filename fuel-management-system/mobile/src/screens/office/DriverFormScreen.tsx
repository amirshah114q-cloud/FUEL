import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ToggleRow } from '../../components/ToggleRow';
import { InfoBanner } from '../../components/Feedback';
import { LoadingOverlay } from '../../components/Loading';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { OptionPickerModal, PickerOption } from '../../components/OptionPickerModal';
import { useAuth } from '../../context/AuthContext';
import { createDriver, deleteDriver, DriverPayload, getDriver, updateDriver } from '../../services/driverService';
import { listVehicles } from '../../services/vehicleService';
import { getErrorMessage } from '../../services/fuelService';
import { ApiError } from '../../services/api';
import { VehicleDTO } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverForm'>;

export default function DriverFormScreen({ route, navigation }: Props): JSX.Element {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const driverId = route.params?.driverId;
  const isEdit = !!driverId;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [assignedVehicleId, setAssignedVehicleId] = useState<string | null>(null);
  const [assignedVehicleLabel, setAssignedVehicleLabel] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([]);
  const [vehiclePickerVisible, setVehiclePickerVisible] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const vehicleList = await listVehicles({ limit: 100 });
        setVehicles(vehicleList);
        if (driverId) {
          const driver = await getDriver(driverId);
          setName(driver.name);
          setPhone(driver.phone);
          setEmployeeId(driver.employeeId);
          setAssignedVehicleId(driver.assignedVehicle?.id ?? null);
          setAssignedVehicleLabel(driver.assignedVehicle?.vehicleNumber ?? null);
          setIsActive(driver.isActive);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [driverId]);

  const vehicleOptions: PickerOption[] = vehicles.map((v) => ({
    id: v.id,
    label: v.vehicleNumber,
    sublabel: `${v.vehicleType} • ${v.model}${v.isActive ? '' : ' • inactive'}`
  }));

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
    if (phone.trim().length < 7) errors.phone = 'Phone must be at least 7 characters.';
    if (employeeId.trim().length < 2) errors.employeeId = 'Employee ID must be at least 2 characters.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async (): Promise<void> => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: DriverPayload = {
        name: name.trim(),
        phone: phone.trim(),
        employeeId: employeeId.trim().toUpperCase(),
        assignedVehicleId,
        isActive
      };
      if (isEdit) await updateDriver(driverId!, payload);
      else await createDriver(payload);
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
      await deleteDriver(driverId!);
      navigation.goBack();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const title = isEdit ? (isAdmin ? 'Edit Driver' : 'Driver Details') : 'Add Driver';

  return (
    <Screen>
      <ScreenHeader title={title} subtitle={isAdmin ? undefined : 'View only'} />

      {error ? <InfoBanner message={error} tone="error" /> : null}

      <TextField
        label="Full Name"
        value={name}
        onChangeText={setName}
        error={fieldErrors.name}
        editable={!isAdmin}
        placeholder="e.g. Ahmed Khan"
      />
      <TextField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        error={fieldErrors.phone}
        editable={!isAdmin}
        keyboardType="phone-pad"
        placeholder="+92-300-1234567"
      />
      <TextField
        label="Employee ID"
        value={employeeId}
        onChangeText={setEmployeeId}
        error={fieldErrors.employeeId}
        editable={!isAdmin}
        autoCapitalize="characters"
        placeholder="EMP-DRV-004"
      />

      <Text style={styles.pickerLabel}>Assigned Vehicle</Text>
      <Pressable
        style={[styles.selectorRow, !isAdmin && { opacity: 0.8 }]}
        onPress={() => isAdmin && setVehiclePickerVisible(true)}
        disabled={!isAdmin}
      >
        <Ionicons name="car-outline" size={18} color={colors.primary} />
        <Text style={[styles.selectorText, !assignedVehicleLabel && { color: colors.muted }]} numberOfLines={1}>
          {assignedVehicleLabel ?? 'No vehicle assigned'}
        </Text>
        {isAdmin ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
      </Pressable>
      <Text style={styles.pickerHint}>
        Assigning a vehicle automatically unassigns it from any other driver.
      </Text>

      <ToggleRow
        label="Active"
        sublabel="Inactive drivers cannot record new fuel entries"
        value={isActive}
        onValueChange={setIsActive}
        disabled={!isAdmin}
      />

      {isAdmin ? (
        <>
          <Button
            title={isEdit ? 'Save Changes' : 'Create Driver'}
            onPress={save}
            loading={saving}
            style={{ marginTop: spacing.sm }}
          />
          {isEdit ? (
            <Button
              title="Delete Driver"
              variant="danger"
              onPress={() => setConfirmDelete(true)}
              loading={deleting}
              style={{ marginTop: spacing.md }}
            />
          ) : null}
        </>
      ) : null}

      <LoadingOverlay visible={loading} label="Loading driver…" />
      <LoadingOverlay visible={saving} label="Saving driver…" />

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this driver?"
        message="This permanently removes the driver profile. Drivers with recorded fuel entries cannot be deleted — deactivate them instead."
        confirmLabel="Delete"
        destructive
        onConfirm={performDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <OptionPickerModal
        visible={vehiclePickerVisible}
        title="Assign Vehicle"
        options={vehicleOptions}
        selectedId={assignedVehicleId}
        includeClear
        clearLabel="No vehicle"
        onSelect={(option) => {
          setAssignedVehicleId(option?.id ?? null);
          setAssignedVehicleLabel(option?.label ?? null);
        }}
        onClose={() => setVehiclePickerVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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