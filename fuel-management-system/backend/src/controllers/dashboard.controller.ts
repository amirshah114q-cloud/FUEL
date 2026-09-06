import { Response } from 'express';
import { AuthRequest } from '../types';
import * as dashboardService from '../services/dashboard.service';
import { getQueryParams } from '../utils/query';

export async function getSummary(req: AuthRequest, res: Response): Promise<void> {
  const data = await dashboardService.getSummary(getQueryParams(req).month);
  res.status(200).json({ success: true, data });
}

export async function getMonthly(req: AuthRequest, res: Response): Promise<void> {
  const data = await dashboardService.getMonthlyTrend(getQueryParams(req).months);
  res.status(200).json({ success: true, data });
}

export async function getDaily(req: AuthRequest, res: Response): Promise<void> {
  const data = await dashboardService.getDailyUsage(getQueryParams(req).month);
  res.status(200).json({ success: true, data });
}

export async function getVehicleExpenses(req: AuthRequest, res: Response): Promise<void> {
  const data = await dashboardService.getVehicleExpenses(getQueryParams(req).month);
  res.status(200).json({ success: true, data });
}

export async function getDriverExpenses(req: AuthRequest, res: Response): Promise<void> {
  const data = await dashboardService.getDriverExpenses(getQueryParams(req).month);
  res.status(200).json({ success: true, data });
}