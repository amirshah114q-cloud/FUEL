import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ToggleRow } from '../../components/ToggleRow';
import { InfoBanner } from '../../components/Feedback';
import { LoadingOverlay } from '../../components/Loading';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { OptionPickerModal, PickerOption } from '../../components/OptionPickerModal';
import { useAuth } from '../../context/AuthContext';
import { listDrivers } from '../../services/driverService';
import { createVehicle, deleteVehicle, getVehicle, updateVehicle, VehiclePayload } from '../../services/vehicleService';
import { getErrorMessage } from '../../services/fuelService';
import { ApiError } from '../../services/api';
import { DriverDTO } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleForm'>;

export default function VehicleFormScreen({ route, navigation }: Props): JSX.Element {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const vehicleId = route.params?.vehicleId;
  const isEdit = !!vehicleId;

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [model, setModel] = useState('');
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);
  const [assignedDriverLabel, setAssignedDriverLabel] = useState<string | null>(null);
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
        const driverList = await listDrivers({ limit: 100 });
        setDrivers(driverList);
        if (vehicleId) {
          const vehicle = await getVehicle(vehicleId);
          setVehicleNumber(vehicle.vehicleNumber);
          setVehicleType(vehicle.vehicleType);
          setModel(vehicle.model);
          setAssignedDriverId(vehicle.assignedDriver?.id ?? null);
          setAssignedDriverLabel(vehicle.assignedDriver?.name ?? null);
          setIsActive(vehicle.isActive);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [vehicleId]);

  const driverOptions: PickerOption[] = drivers.map((d) => ({
    id: d.id,
    label: d.name,
    sublabel: `${d.employeeId}${d.isActive ? '' : ' • inactive'}`
  }));

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (vehicleNumber.trim().length < 2) errors.vehicleNumber = 'Vehicle number is required.';
    else if (!/^[A-Za-z0-9\- ]+$/.test(vehicleNumber.trim()))
      errors.vehicleNumber = 'Only letters, numbers, spaces and hyphens are allowed.';
    if (vehicleType.trim().length < 2) errors.vehicleType = 'Vehicle type is required.';
    if (model.trim().length < 2) errors.model = 'Model is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async (): Promise<void> => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: VehiclePayload = {
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType: vehicleType.trim(),
        model: model.trim(),
        assignedDriverId,
        isActive
      };
      if (isEdit) await updateVehicle(vehicleId!, payload);
      else await createVehicle(payload);
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
      await deleteVehicle(vehicleId!);
      navigation.goBack();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const title = isEdit ? (isAdmin ? 'Edit Vehicle' : 'Vehicle Details') : 'Add Vehicle';

  return (
    <Screen>
      <ScreenHeader title={title} subtitle={isAdmin ? undefined : 'View only'} />

      {error ? <InfoBanner message={error} tone="error" /> : null}

      <TextField
        label="Vehicle Number"
        value={vehicleNumber}
        onChangeText={setVehicleNumber}
        error={fieldErrors.vehicleNumber}
        editable={!isAdmin}
        autoCapitalize="characters"
        placeholder="KHI-5678"
      />
      <TextField
        label="Vehicle Type"
        value={vehicleType}
        onChangeText={setVehicleType}
        error={fieldErrors.vehicleType}
        editable={!isAdmin}
        placeholder="Van / Pickup / Truck"
      />
      <TextField
        label="Model"
        value={model}
        onChangeText={setModel}
        error={fieldErrors.model}
        editable={!isAdmin}
        placeholder="Suzuki Bolan 2022"
      />

      <Text style={styles.pickerLabel}>Assigned Driver</Text>
      <Pressable
        style={[styles.selectorRow, !isAdmin && { opacity: 0.8 }]}
        onPress={() => isAdmin && setDriverPickerVisible(true)}
        disabled={!isAdmin}
      >
        <Ionicons name="person-outline" size={18} color={colors.primary} />
        <Text style={[styles.selectorText, !assignedDriverLabel && { color: colors.muted }]} numberOfLines={1}>
          {assignedDriverLabel ?? 'No driver assigned'}
        </Text>
        {isAdmin ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
      </Pressable>
      <Text style={styles.pickerHint}>
        Assigning a driver automatically unassigns them from any other vehicle.
      </Text>

      <ToggleRow
        label="Active"
        sublabel="Inactive vehicles are kept for history but cannot receive new entries"
        value={isActive}
        onValueChange={setIsActive}
        disabled={!isAdmin}
      />

      {isAdmin ? (
        <>
          <Button
            title={isEdit ? 'Save Changes' : 'Create Vehicle'}
            onPress={save}
            loading={saving}
            style={{ marginTop: spacing.sm }}
          />
          {isEdit ? (
            <Button
              title="Delete Vehicle"
              variant="danger"
              onPress={() => setConfirmDelete(true)}
              loading={deleting}
              style={{ marginTop: spacing.md }}
            />
          ) : null}
        </>
      ) : null}

      <LoadingOverlay visible={loading} label="Loading vehicle…" />
      <LoadingOverlay visible={saving} label="Saving vehicle…" />

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this vehicle?"
        message="This permanently removes the vehicle. Vehicles with recorded fuel entries cannot be deleted — deactivate them instead."
        confirmLabel="Delete"
        destructive
        onConfirm={performDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <OptionPickerModal
        visible={driverPickerVisible}
        title="Assign Driver"
        options={driverOptions}
        selectedId={assignedDriverId}
        includeClear
        clearLabel="No driver"
        onSelect={(option) => {
          setAssignedDriverId(option?.id ?? null);
          setAssignedDriverLabel(option?.label ?? null);
        }}
        onClose={() => setDriverPickerVisible(false)}
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