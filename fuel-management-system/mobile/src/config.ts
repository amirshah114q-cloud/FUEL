/**
 * Central API base URL.
 * Set EXPO_PUBLIC_API_URL in mobile/.env (see .env.example).
 * The default targets the Android emulator's host loopback (10.0.2.2),
 * so the app works out-of-the-box in local development.
 */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:5000';

export const APP_VERSION = '1.0.0';