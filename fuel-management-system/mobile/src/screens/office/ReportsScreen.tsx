import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Card, StatCard } from '../../components/Card';
import { Button } from '../../components/Button';
import { ChipGroup } from '../../components/ChipGroup';
import { InfoBanner, ErrorState } from '../../components/Feedback';
import { LoadingSpinner, LoadingOverlay } from '../../components/Loading';
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart';
import { OptionPickerModal, PickerOption } from '../../components/OptionPickerModal';
import { listDrivers } from '../../services/driverService';
import { listVehicles } from '../../services/vehicleService';
import { downloadMonthlyReportPdf, getMonthlyReport, shareReportPdf } from '../../services/reportService';
import { getErrorMessage } from '../../services/fuelService';
import { DriverDTO, FuelType, MonthlyReport, VehicleDTO } from '../../types/models';
import { currentMonth, formatDateTime, formatLiters, formatMoney, monthLabel, shiftMonth } from '../../utils/format';
import { colors, radius, spacing } from '../../theme';

export default function ReportsScreen(): JSX.Element {
  const [month, setMonth] = useState(currentMonth());
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverLabel, setDriverLabel] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [vehicleLabel, setVehicleLabel] = useState<string | null>(null);
  const [fuelType, setFuelType] = useState<FuelType | null>(null);

  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([]);
  const [driverPickerVisible, setDriverPickerVisible] = useState(false);
  const [vehiclePickerVisible, setVehiclePickerVisible] = useState(false);

  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load driver/vehicle lists once for the filter pickers.
  useEffect(() => {
    (async () => {
      try {
        const [driverList, vehicleList] = await Promise.all([
          listDrivers({ limit: 100 }),
          listVehicles({ limit: 100 })
        ]);
        setDrivers(driverList);
        setVehicles(vehicleList);
      } catch {
        // Pickers will show empty lists; the report itself still works.
      }
    })();
  }, []);

  // Load the JSON preview whenever the month or filters change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMonthlyReport({
          month,
          driverId: driverId ?? undefined,
          vehicleId: vehicleId ?? undefined,
          fuelType: fuelType ?? undefined
        });
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, driverId, vehicleId, fuelType]);

  const onDownload = async (): Promise<void> => {
    setActionError(null);
    setDownloading(true);
    try {
      const uri = await downloadMonthlyReportPdf({
        month,
        driverId: driverId ?? undefined,
        vehicleId: vehicleId ?? undefined,
        fuelType: fuelType ?? undefined
      });
      await shareReportPdf(uri);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const driverOptions: PickerOption[] = drivers.map((d) => ({
    id: d.id,
    label: d.name,
    sublabel: d.employeeId
  }));
  const vehicleOptions: PickerOption[] = vehicles.map((v) => ({
    id: v.id,
    label: v.vehicleNumber,
    sublabel: `${v.vehicleType} • ${v.model}`
  }));

  return (
    <Screen>
      <ScreenHeader title="Monthly Reports" subtitle="Generate, download and print PDF reports" />

      {/* Month navigation */}
      <View style={styles.monthRow}>
        <Text style={styles.monthArrow} onPress={() => setMonth((m) => shiftMonth(m, -1))}>
          ‹
        </Text>
        <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
        <Text
          style={[styles.monthArrow, month === currentMonth() && { opacity: 0.3 }]}
          onPress={() => {
            if (month !== currentMonth()) setMonth((m) => shiftMonth(m, 1));
          }}
        >
          ›
        </Text>
      </View>

      {/* Report filters */}
      <Text style={styles.pickerLabel}>Driver (optional)</Text>
      <Pressable style={styles.selectorRow} onPress={() => setDriverPickerVisible(true)}>
        <Ionicons name="person-outline" size={18} color={colors.primary} />
        <Text style={[styles.selectorText, !driverLabel && { color: colors.muted }]} numberOfLines={1}>
          {driverLabel ?? 'All drivers'}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      <Text style={styles.pickerLabel}>Vehicle (optional)</Text>
      <Pressable style={styles.selectorRow} onPress={() => setVehiclePickerVisible(true)}>
        <Ionicons name="car-outline" size={18} color={colors.primary} />
        <Text style={[styles.selectorText, !vehicleLabel && { color: colors.muted }]} numberOfLines={1}>
          {vehicleLabel ?? 'All vehicles'}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      <Text style={styles.pickerLabel}>Fuel Type</Text>
      <ChipGroup<FuelType>
        options={[
          { value: 'Petrol', label: 'Petrol' },
          { value: 'Diesel', label: 'Diesel' }
        ]}
        value={fuelType}
        onSelect={(v) => setFuelType(v ?? null)}
      />

      {/* Report preview */}
      {loading ? (
        <LoadingSpinner label="Building report…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setMonth((m) => `${m}`)} />
      ) : report ? (
        <>
          {report.totals.entries === 0 ? (
            <InfoBanner
              message={`No fuel entries were recorded for ${report.monthLabel}. The PDF will still be generated with zero totals.`}
              tone="info"
            />
          ) : null}

          <View style={styles.statsRow}>
            <StatCard
              label="Total Expense"
              value={formatMoney(report.totals.amount)}
              icon="cash-outline"
              tone="primary"
            />
            <StatCard
              label="Fuel Used"
              value={formatLiters(report.totals.liters)}
              icon="water-outline"
              tone="accent"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Entries" value={String(report.totals.entries)} icon="receipt-outline" />
            <StatCard
              label="Avg / Entry"
              value={formatMoney(report.totals.averageAmountPerEntry)}
              icon="trending-up-outline"
              tone="success"
            />
          </View>

          <Text style={styles.caption}>
            Report generated {formatDateTime(report.generatedAt)} — the full entry table
            ({report.totals.entries} {report.totals.entries === 1 ? 'row' : 'rows'}) is included in the PDF.
          </Text>

          {report.byFuelType.length > 0 ? (
            <Card style={styles.chartCard}>
              <Text style={styles.cardTitle}>Fuel Type Split</Text>
              <HorizontalBarChart
                data={report.byFuelType.map((f) => ({
                  key: f.fuelType,
                  label: f.fuelType,
                  sublabel: `${f.entries} ${f.entries === 1 ? 'entry' : 'entries'} • ${f.sharePercent.toFixed(1)}%`,
                  value: f.amount
                }))}
                formatValue={(v) => formatMoney(v)}
              />
            </Card>
          ) : null}

          <Card style={styles.chartCard}>
            <Text style={styles.cardTitle}>Driver-wise Breakdown</Text>
            <Text style={styles.cardSubtitle}>Included as a table in the PDF</Text>
            {report.byDriver.length === 0 ? (
              <Text style={styles.emptyText}>No driver data for this period.</Text>
            ) : (
              <HorizontalBarChart
                data={report.byDriver.map((d) => ({
                  key: d.id,
                  label: d.label,
                  sublabel: `${d.sublabel} • ${d.entries} ${d.entries === 1 ? 'entry' : 'entries'} • ${d.sharePercent.toFixed(1)}%`,
                  value: d.amount
                }))}
                formatValue={(v) => formatMoney(v)}
              />
            )}
          </Card>

          <Card style={styles.chartCard}>
            <Text style={styles.cardTitle}>Vehicle-wise Summary</Text>
            <Text style={styles.cardSubtitle}>Included as a table in the PDF</Text>
            {report.byVehicle.length === 0 ? (
              <Text style={styles.emptyText}>No vehicle data for this period.</Text>
            ) : (
              <HorizontalBarChart
                data={report.byVehicle.map((v) => ({
                  key: v.id,
                  label: v.label,
                  sublabel: `${v.sublabel} • ${v.entries} ${v.entries === 1 ? 'entry' : 'entries'} • ${v.sharePercent.toFixed(1)}%`,
                  value: v.amount
                }))}
                formatValue={(v) => formatMoney(v)}
              />
            )}
          </Card>

          {actionError ? <InfoBanner message={actionError} tone="error" /> : null}

          <Button
            title="Download / Print PDF"
            onPress={onDownload}
            loading={downloading}
            icon={<Ionicons name="download-outline" size={20} color={colors.white} />}
            style={styles.cta}
          />
          <Text style={styles.printHint}>
            From the share sheet you can Print (Android 9+), Save to Drive or Files, or send the
            report via WhatsApp / Email for office record-keeping.
          </Text>
        </>
      ) : null}

      <LoadingOverlay visible={downloading} label="Preparing PDF report…" />

      <OptionPickerModal
        visible={driverPickerVisible}
        title="Report for Driver"
        options={driverOptions}
        selectedId={driverId}
        includeClear
        clearLabel="All drivers"
        onSelect={(option) => {
          setDriverId(option?.id ?? null);
          setDriverLabel(option?.label ?? null);
        }}
        onClose={() => setDriverPickerVisible(false)}
      />
      <OptionPickerModal
        visible={vehiclePickerVisible}
        title="Report for Vehicle"
        options={vehicleOptions}
        selectedId={vehicleId}
        includeClear
        clearLabel="All vehicles"
        onSelect={(option) => {
          setVehicleId(option?.id ?? null);
          setVehicleLabel(option?.label ?? null);
        }}
        onClose={() => setVehiclePickerVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg
  },
  monthArrow: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.md,
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    marginTop: spacing.md
  },
  caption: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg
  },
  chartCard: {
    marginBottom: spacing.lg
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.md
  },
  cta: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  printHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl
  }
});