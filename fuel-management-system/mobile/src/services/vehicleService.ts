import { apiRequest } from './api';
import { VehicleDTO } from '../types/models';

export interface VehiclePayload {
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  assignedDriverId?: string | null;
  isActive?: boolean;
}

export interface VehicleListParams {
  search?: string;
  isActive?: boolean;
  limit?: number;
}

export async function listVehicles(params: VehicleListParams = {}): Promise<VehicleDTO[]> {
  const qs = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
  const envelope = await apiRequest<VehicleDTO[]>(`/vehicles${qs ? `?${qs}` : ''}`);
  return envelope.data ?? [];
}

export async function getVehicle(id: string): Promise<VehicleDTO> {
  const envelope = await apiRequest<VehicleDTO>(`/vehicles/${id}`);
  return envelope.data;
}

export async function createVehicle(payload: VehiclePayload): Promise<VehicleDTO> {
  const envelope = await apiRequest<VehicleDTO>('/vehicles', { method: 'POST', body: payload });
  return envelope.data;
}

export async function updateVehicle(id: string, payload: Partial<VehiclePayload>): Promise<VehicleDTO> {
  const envelope = await apiRequest<VehicleDTO>(`/vehicles/${id}`, { method: 'PUT', body: payload });
  return envelope.data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await apiRequest<unknown>(`/vehicles/${id}`, { method: 'DELETE' });
}