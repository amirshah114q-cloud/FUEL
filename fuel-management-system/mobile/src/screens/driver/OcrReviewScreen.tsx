import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { DatePickerField } from '../../components/DatePickerField';
import { FuelTypeSelector } from '../../components/FuelTypeSelector';
import { InfoBanner } from '../../components/Feedback';
import { LoadingOverlay } from '../../components/Loading';
import { SlipImageModal } from '../../components/SlipImageModal';
import { useAuth } from '../../context/AuthContext';
import { createFuelEntry, getErrorMessage } from '../../services/fuelService';
import { ApiError } from '../../services/api';
import { FuelEntry, FuelType, OcrProcessResponse } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';
import { PickedFile, formatBytes } from '../../utils/pickers';
import { formatDate, formatMoney, round2 } from '../../utils/format';
import { ReviewForm, validateReviewForm } from '../../utils/validation';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OcrReview'>;

const FIELD_KEYS: Array<keyof OcrProcessResponse['ocr']['fields']> = [
  'date', 'time', 'petrolPumpName', 'vehicleNumber', 'fuelType',
  'liters', 'pricePerLiter', 'totalAmount', 'receiptNumber'
];

export default function OcrReviewScreen({ route, navigation }: Props): JSX.Element {
  const { file, ocr } = route.params;
  const { driverProfile } = useAuth();

  const [form, setForm] = useState<ReviewForm>(() => ({
    date: ocr.ocr.fields.date ?? '',
    time: ocr.ocr.fields.time ?? '',
    petrolPumpName: ocr.ocr.fields.petrolPumpName ?? '',
    vehicleNumber:
      ocr.ocr.fields.vehicleNumber ?? driverProfile?.vehicle?.vehicleNumber ?? '',
    fuelType: ocr.ocr.fields.fuelType ?? '',
    liters: ocr.ocr.fields.liters !== null ? String(ocr.ocr.fields.liters) : '',
    pricePerLiter: ocr.ocr.fields.pricePerLiter !== null ? String(ocr.ocr.fields.pricePerLiter) : '',
    totalAmount: ocr.ocr.fields.totalAmount !== null ? String(ocr.ocr.fields.totalAmount) : '',
    receiptNumber: ocr.ocr.fields.receiptNumber ?? ''
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [totalManuallyEdited, setTotalManuallyEdited] = useState(
    ocr.ocr.fields.totalAmount !== null
  );
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState<FuelEntry | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  /** Fields the OCR could not read — highlighted in amber for manual entry. */
  const missingFields = useMemo<string[]>(
    () => FIELD_KEYS.filter((key) => ocr.ocr.fields[key] === null),
    [ocr]
  );
  const foundCount = FIELD_KEYS.length - missingFields.length;

  // Auto-compute Total = Liters × Price unless the driver typed a total.
  useEffect(() => {
    if (totalManuallyEdited) return;
    const liters = parseFloat(form.liters);
    const price = parseFloat(form.pricePerLiter);
    if (Number.isFinite(liters) && Number.isFinite(price) && liters > 0 && price > 0) {
      setForm((prev) => ({ ...prev, totalAmount: round2(liters * price).toFixed(2) }));
    } else if (ocr.ocr.fields.totalAmount === null) {
      setForm((prev) => ({ ...prev, totalAmount: '' }));
    }
  }, [form.liters, form.pricePerLiter, totalManuallyEdited, ocr.ocr.fields.totalAmount]);

  const update = (key: keyof ReviewForm, value: string | FuelType): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onSave = async (): Promise<void> => {
    const validationErrors = validateReviewForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert(
        'Please check the form',
        'Some fields are missing or invalid. Correct the highlighted fields and try again.'
      );
      return;
    }

    setSubmitError(null);
    setSaving(true);
    try {
      const entry = await createFuelEntry({
        date: form.date,
        time: form.time.trim() ? form.time.trim() : undefined,
        petrolPumpName: form.petrolPumpName.trim(),
        vehicleNumber: form.vehicleNumber.trim() || undefined,
        fuelType: form.fuelType as FuelType,
        liters: parseFloat(form.liters),
        pricePerLiter: parseFloat(form.pricePerLiter),
        totalAmount: parseFloat(form.totalAmount),
        receiptNumber: form.receiptNumber.trim(),
        slipImageUrl: ocr.filePath,
        originalFileName: file.name,
        ocrRawText: ocr.ocr.rawText,
        ...(ocr.ocr.confidence !== null ? { ocrConfidence: ocr.ocr.confidence } : {})
      });
      setSaved(entry);
    } catch (err) {
      if (err instanceof ApiError && err.errors && Object.keys(err.errors).length > 0) {
        setErrors(err.errors as Record<string, string>);
        setSubmitError('The server rejected some values. Please correct the highlighted fields.');
      } else {
        setSubmitError(getErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Screen>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Fuel Entry Saved</Text>
          <Text style={styles.successMessage}>
            {formatDate(saved.date)} • {formatLitersLine(saved.liters)} • {formatMoney(saved.totalAmount)}
          </Text>
          <Text style={styles.successNote}>
            Your entry is now visible to the office along with the original slip.
          </Text>
          <Button
            title="View Entry"
            onPress={() =>
              navigation.reset({
                index: 1,
                routes: [{ name: 'DriverTabs' }, { name: 'EntryDetail', params: { entryId: saved.id } }]
              })
            }
            style={{ marginTop: spacing.xl }}
          />
          <Button
            title="Back to Home"
            variant="secondary"
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DriverTabs' }] })}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </Screen>
    );
  }

  const isMissing = (key: string): boolean => missingFields.includes(key);

  return (
    <Screen>
      <ScreenHeader title="Review Slip Details" subtitle="Verify every field before saving" />

      {/* Slip preview */}
      <Card style={styles.slipCard}>
        {file.kind === 'image' ? (
          <PressableRow uri={currentFileUri(file)} onOpen={() => setImageModalVisible(true)} />
        ) : (
          <View style={styles.pdfRow}>
            <Ionicons name="document-text-outline" size={22} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pdfFileName} numberOfLines={1}>{file.name}</Text>
              <Text style={styles.pdfFileSize}>PDF slip • {formatBytes(file.size)}</Text>
            </View>
          </View>
        )}
        <Text style={styles.ocrMeta}>
          OCR: {ocr.ocr.provider}
          {ocr.ocr.confidence !== null ? ` (${Math.round(ocr.ocr.confidence)}% confidence)` : ''} — read{' '}
          {foundCount} of {FIELD_KEYS.length} fields
        </Text>
      </Card>

      <SlipImageModal
        visible={imageModalVisible}
        uri={currentFileUri(file)}
        onClose={() => setImageModalVisible(false)}
      />

      {ocr.ocr.warnings.length > 0 ? (
        <InfoBanner message={ocr.ocr.warnings[0]} tone="warning" />
      ) : (
        <InfoBanner
          message="Auto-filled from OCR — please check each value against the slip before saving."
          tone="info"
        />
      )}

      {submitError ? <InfoBanner message={submitError} tone="error" /> : null}

      <DatePickerField
        label="Date"
        value={form.date}
        onChange={(iso) => update('date', iso)}
        error={errors.date}
        highlight={isMissing('date')}
      />

      <TextField
        label="Time"
        value={form.time}
        onChangeText={(t) => update('time', t)}
        error={errors.time}
        highlight={isMissing('time')}
        hint="HH:MM, 24-hour (optional)"
        placeholder="14:32"
        autoCapitalize="none"
      />

      <TextField
        label="Petrol Pump"
        value={form.petrolPumpName}
        onChangeText={(t) => update('petrolPumpName', t)}
        error={errors.petrolPumpName}
        highlight={isMissing('petrolPumpName')}
        placeholder="e.g. PSO Petrol Pump"
      />

      <TextField
        label="Vehicle Number"
        value={form.vehicleNumber}
        onChangeText={(t) => update('vehicleNumber', t)}
        error={errors.vehicleNumber}
        highlight={isMissing('vehicleNumber')}
        placeholder="e.g. KHI-1234"
        autoCapitalize="characters"
      />

      <FuelTypeSelector
        value={form.fuelType}
        onChange={(v) => update('fuelType', v)}
        error={errors.fuelType}
      />

      <TextField
        label="Liters"
        value={form.liters}
        onChangeText={(t) => update('liters', t)}
        error={errors.liters}
        highlight={isMissing('liters')}
        keyboardType="decimal-pad"
        suffix="L"
        placeholder="45.50"
      />

      <TextField
        label="Price / Liter"
        value={form.pricePerLiter}
        onChangeText={(t) => update('pricePerLiter', t)}
        error={errors.pricePerLiter}
        highlight={isMissing('pricePerLiter')}
        keyboardType="decimal-pad"
        suffix="Rs/L"
        placeholder="285.50"
      />

      <TextField
        label="Total Amount"
        value={form.totalAmount}
        onChangeText={(t) => {
          setTotalManuallyEdited(true);
          update('totalAmount', t);
        }}
        error={errors.totalAmount}
        highlight={isMissing('totalAmount')}
        hint="Auto-calculated from Liters × Price — edit if the slip shows a different total."
        keyboardType="decimal-pad"
        suffix="Rs"
        placeholder="12990.25"
      />

      <TextField
        label="Receipt Number"
        value={form.receiptNumber}
        onChangeText={(t) => update('receiptNumber', t)}
        error={errors.receiptNumber}
        highlight={isMissing('receiptNumber')}
        placeholder="e.g. RCP-90211"
        autoCapitalize="characters"
      />

      <Button title="Save Verified Entry" onPress={onSave} style={styles.saveButton} />

      <LoadingOverlay visible={saving} label="Saving your fuel entry…" />
    </Screen>
  );
}

function currentFileUri(file: PickedFile): string {
  return file.uri;
}

function formatLitersLine(liters: number): string {
  return `${liters.toFixed(2)} L`;
}

function PressableRow({ uri, onOpen }: { uri: string; onOpen: () => void }): JSX.Element {
  return (
    <PressableWrapper onPress={onOpen}>
      <Image source={{ uri }} style={styles.slipThumb} resizeMode="cover" />
      <Text style={styles.tapHint}>Tap to view the full slip</Text>
    </PressableWrapper>
  );
}

import { Pressable } from 'react-native';
function PressableWrapper({ onPress, children }: { onPress: () => void; children: React.ReactNode }): JSX.Element {
  return <Pressable onPress={onPress}>{children}</Pressable>;
}

const styles = StyleSheet.create({
  slipCard: {
    marginBottom: spacing.lg
  },
  slipThumb: {
    width: '100%',
    height: 140,
    borderRadius: radius.md,
    backgroundColor: '#00000008'
  },
  tapHint: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6
  },
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  pdfFileName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  pdfFileSize: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2
  },
  ocrMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: spacing.md
  },
  saveButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl
  },
  successWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl
  },
  successIcon: {
    marginBottom: spacing.lg
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text
  },
  successMessage: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 6
  },
  successNote: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19
  }
});