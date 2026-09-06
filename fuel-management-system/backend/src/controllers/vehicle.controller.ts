import { Response } from 'express';
import { AuthRequest } from '../types';
import * as vehicleService from '../services/vehicle.service';
import { getQueryParams } from '../utils/query';

export async function listVehicles(req: AuthRequest, res: Response): Promise<void> {
  const result = await vehicleService.listVehicles(getQueryParams(req));
  res.status(200).json({ success: true, data: result.vehicles, meta: result.pagination });
}

export async function getVehicle(req: AuthRequest, res: Response): Promise<void> {
  const vehicle = await vehicleService.getVehicleById(req.params.id);
  res.status(200).json({ success: true, data: vehicle });
}

export async function createVehicle(req: AuthRequest, res: Response): Promise<void> {
  const vehicle = await vehicleService.createVehicle(req.body);
  res.status(201).json({ success: true, message: 'Vehicle created successfully.', data: vehicle });
}

export async function updateVehicle(req: AuthRequest, res: Response): Promise<void> {
  const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Vehicle updated successfully.', data: vehicle });
}

export async function deleteVehicle(req: AuthRequest, res: Response): Promise<void> {
  await vehicleService.deleteVehicle(req.params.id);
  res.status(200).json({ success: true, message: 'Vehicle deleted successfully.' });
}