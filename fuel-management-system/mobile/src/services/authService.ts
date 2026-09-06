import * as SecureStore from 'expo-secure-store';
import { apiRequest } from './api';
import { DriverProfileInfo, SafeUser } from '../types/models';

const TOKEN_KEY = 'fleet.auth.token';

export interface LoginResponse {
  token: string;
  user: SafeUser;
}

export interface MeResponse {
  user: SafeUser;
  driver: DriverProfileInfo | null;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const envelope = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  return envelope.data;
}

export async function fetchMe(): Promise<MeResponse> {
  const envelope = await apiRequest<MeResponse>('/auth/me');
  return envelope.data;
}

export async function persistToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function loadStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Ignore secure-store failures during logout.
  }
}
/** Self-service password change (all roles). */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiRequest<unknown>('/auth/change-password', {
    method: 'PUT',
    body: { currentPassword, newPassword }
  });
}