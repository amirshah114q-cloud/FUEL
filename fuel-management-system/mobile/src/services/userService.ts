import { apiRequest } from './api';
import { SafeUser, UserRole } from '../types/models';

export interface UserPayload {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  driverId?: string | null;
  isActive?: boolean;
}

export interface UserListParams {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  limit?: number;
}

export async function listUsers(params: UserListParams = {}): Promise<SafeUser[]> {
  const qs = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
  const envelope = await apiRequest<SafeUser[]>(`/users${qs ? `?${qs}` : ''}`);
  return envelope.data ?? [];
}

export async function createUser(payload: UserPayload): Promise<SafeUser> {
  const envelope = await apiRequest<SafeUser>('/users', { method: 'POST', body: payload });
  return envelope.data;
}

export async function updateUser(id: string, payload: Partial<UserPayload>): Promise<SafeUser> {
  const envelope = await apiRequest<SafeUser>(`/users/${id}`, { method: 'PUT', body: payload });
  return envelope.data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiRequest<unknown>(`/users/${id}`, { method: 'DELETE' });
}