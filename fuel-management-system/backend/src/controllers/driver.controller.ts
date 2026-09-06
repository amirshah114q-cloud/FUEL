import { Response } from 'express';
import { AuthRequest } from '../types';
import * as driverService from '../services/driver.service';
import { getQueryParams } from '../utils/query';

export async function listDrivers(req: AuthRequest, res: Response): Promise<void> {
  const result = await driverService.listDrivers(getQueryParams(req));
  res.status(200).json({ success: true, data: result.drivers, meta: result.pagination });
}

export async function getDriver(req: AuthRequest, res: Response): Promise<void> {
  const driver = await driverService.getDriverById(req.params.id);
  res.status(200).json({ success: true, data: driver });
}

export async function createDriver(req: AuthRequest, res: Response): Promise<void> {
  const driver = await driverService.createDriver(req.body);
  res.status(201).json({ success: true, message: 'Driver created successfully.', data: driver });
}

export async function updateDriver(req: AuthRequest, res: Response): Promise<void> {
  const driver = await driverService.updateDriver(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Driver updated successfully.', data: driver });
}

export async function deleteDriver(req: AuthRequest, res: Response): Promise<void> {
  await driverService.deleteDriver(req.params.id);
  res.status(200).json({ success: true, message: 'Driver deleted successfully.' });
}