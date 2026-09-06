import { Response } from 'express';
import { AuthRequest } from '../types';
import * as fuelService from '../services/fuel.service';
import { getQueryParams } from '../utils/query';

export async function listFuelEntries(req: AuthRequest, res: Response): Promise<void> {
  const result = await fuelService.listFuelEntries(req.user!, getQueryParams(req));
  res.status(200).json({ success: true, data: result.entries, meta: result.pagination });
}

export async function getFuelEntry(req: AuthRequest, res: Response): Promise<void> {
  const entry = await fuelService.getFuelEntryById(req.user!, req.params.id);
  res.status(200).json({ success: true, data: entry });
}

export async function createFuelEntry(req: AuthRequest, res: Response): Promise<void> {
  const entry = await fuelService.createFuelEntry(req.user!, req.body);
  res.status(201).json({
    success: true,
    message: 'Fuel entry saved successfully.',
    data: entry
  });
}

export async function updateFuelEntry(req: AuthRequest, res: Response): Promise<void> {
  const entry = await fuelService.updateFuelEntry(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Fuel entry updated successfully.', data: entry });
}

export async function deleteFuelEntry(req: AuthRequest, res: Response): Promise<void> {
  await fuelService.deleteFuelEntry(req.params.id);
  res.status(200).json({ success: true, message: 'Fuel entry deleted successfully.' });
}