import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../config';
import { apiRequest, ApiError, getAuthToken } from './api';
import { FuelType, MonthlyReport } from '../types/models';

export interface ReportFilters {
  month: string;
  driverId?: string;
  vehicleId?: string;
  fuelType?: FuelType;
}

function buildQueryString(filters: ReportFilters): string {
  const parts: string[] = [`month=${encodeURIComponent(filters.month)}`];
  if (filters.driverId) parts.push(`driverId=${encodeURIComponent(filters.driverId)}`);
  if (filters.vehicleId) parts.push(`vehicleId=${encodeURIComponent(filters.vehicleId)}`);
  if (filters.fuelType) parts.push(`fuelType=${encodeURIComponent(filters.fuelType)}`);
  return parts.join('&');
}

export async function getMonthlyReport(filters: ReportFilters): Promise<MonthlyReport> {
  const envelope = await apiRequest<MonthlyReport>(`/reports/monthly?${buildQueryString(filters)}`);
  return envelope.data;
}

/**
 * Downloads the authenticated PDF to the app cache and returns its local URI.
 * expo-file-system's downloadAsync is used because it streams binaries and
 * supports custom headers (fetch cannot persist files on React Native).
 * If the server returns an error, the partial file is removed and the
 * server's JSON error message is surfaced to the caller.
 */
export async function downloadMonthlyReportPdf(filters: ReportFilters): Promise<string> {
  const token = getAuthToken();
  const dir = `${FileSystem.cacheDirectory}reports`;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // Directory already exists — safe to continue.
  }

  const scopeParts = [
    filters.driverId ? 'driver' : '',
    filters.vehicleId ? 'vehicle' : '',
    filters.fuelType ?? ''
  ].filter(Boolean);
  const fileName = `fuel-report-${filters.month}${scopeParts.length ? `-${scopeParts.join('-')}` : ''}.pdf`;
  const destination = `${dir}/${fileName}`;

  const options: FileSystem.DownloadOptions = {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  };

  const result = await FileSystem.downloadAsync(
    `${API_BASE_URL}/api/reports/monthly/pdf?${buildQueryString(filters)}`,
    destination,
    options
  );

  if (result.status >= 400) {
    let message = 'The report could not be generated. Please try again.';
    try {
      const body = await FileSystem.readAsStringAsync(result.uri);
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      // Keep the default message.
    }
    await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => undefined);
    throw new ApiError(message, result.status);
  }

  return result.uri;
}

/**
 * Opens the Android share sheet for the downloaded PDF. From the sheet the
 * user can Print, Save to Drive/Files, or send it via WhatsApp/Email.
 */
export async function shareReportPdf(uri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new ApiError(
      'Sharing is not available on this device. The PDF was generated but cannot be opened.',
      0
    );
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Fuel Expense Report',
    UTI: 'com.adobe.pdf'
  });
}