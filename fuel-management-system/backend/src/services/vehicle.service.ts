import { FilterQuery, Types } from 'mongoose';
import Vehicle, { IVehicle } from '../models/vehicle.model';
import Driver, { IDriver } from '../models/driver.model';
import FuelEntry from '../models/fuelEntry.model';
import { assignDriverToVehicle } from './fleet.service';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../utils/regex';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export interface VehicleDTO {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  isActive: boolean;
  assignedDriver: {
    id: string;
    name: string;
    employeeId: string;
    phone: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleInput {
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  assignedDriverId?: string | null;
  isActive?: boolean;
}

export interface UpdateVehicleInput {
  vehicleNumber?: string;
  vehicleType?: string;
  model?: string;
  assignedDriverId?: string | null;
  isActive?: boolean;
}

export function toVehicleDTO(vehicle: IVehicle, driver: IDriver | null): VehicleDTO {
  return {
    id: vehicle._id.toString(),
    vehicleNumber: vehicle.vehicleNumber,
    vehicleType: vehicle.vehicleType,
    model: vehicle.model,
    isActive: vehicle.isActive,
    assignedDriver: driver
      ? {
          id: driver._id.toString(),
          name: driver.name,
          employeeId: driver.employeeId,
          phone: driver.phone
        }
      : null,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString()
  };
}

export async function listVehicles(query: Record<string, string | undefined>) {
  const { page, limit, skip } = parsePagination(query);
  const conditions: FilterQuery<IVehicle>[] = [];

  if (query.isActive) {
    if (query.isActive !== 'true' && query.isActive !== 'false') {
      throw ApiError.badRequest('isActive filter must be "true" or "false".');
    }
    conditions.push({ isActive: query.isActive === 'true' });
  }

  if (query.assignedDriverId) {
    if (!Types.ObjectId.isValid(query.assignedDriverId)) {
      throw ApiError.badRequest('Invalid assignedDriverId filter.');
    }
    conditions.push({ assignedDriverId: new Types.ObjectId(query.assignedDriverId) });
  }

  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search.trim()), 'i');
    conditions.push({ $or: [{ vehicleNumber: rx }, { model: rx }, { vehicleType: rx }] });
  }

  const filter: FilterQuery<IVehicle> = conditions.length ? { $and: conditions } : {};

  const [vehicles, total] = await Promise.all([
    Vehicle.find(filter)
      .sort({ vehicleNumber: 1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedDriverId', 'name employeeId phone'),
    Vehicle.countDocuments(filter)
  ]);

  const dtos = vehicles.map((vehicle) =>
    toVehicleDTO(vehicle, vehicle.assignedDriverId as unknown as IDriver | null)
  );

  return { vehicles: dtos, pagination: buildPaginationMeta(page, limit, total) };
}

export async function getVehicleById(id: string): Promise<VehicleDTO> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid vehicle id.');

  const vehicle = await Vehicle.findById(id).populate('assignedDriverId', 'name employeeId phone');
  if (!vehicle) throw ApiError.notFound('Vehicle not found.');

  return toVehicleDTO(vehicle, vehicle.assignedDriverId as unknown as IDriver | null);
}

export async function createVehicle(input: CreateVehicleInput): Promise<VehicleDTO> {
  const vehicleNumber = input.vehicleNumber.trim().toUpperCase();
  const existing = await Vehicle.findOne({ vehicleNumber });
  if (existing) throw ApiError.conflict(`A vehicle with number ${vehicleNumber} already exists.`);

  const vehicle = new Vehicle({
    vehicleNumber,
    vehicleType: input.vehicleType.trim(),
    model: input.model.trim(),
    isActive: input.isActive ?? true,
    assignedDriverId: null
  });

  if (input.assignedDriverId) {
    await assignDriverToVehicle(vehicle, input.assignedDriverId);
  }

  await vehicle.save();
  return getVehicleById(vehicle._id.toString());
}

export async function updateVehicle(id: string, input: UpdateVehicleInput): Promise<VehicleDTO> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid vehicle id.');

  const vehicle = await Vehicle.findById(id);
  if (!vehicle) throw ApiError.notFound('Vehicle not found.');

  if (input.vehicleNumber !== undefined) {
    const vehicleNumber = input.vehicleNumber.trim().toUpperCase();
    if (vehicleNumber !== vehicle.vehicleNumber) {
      const existing = await Vehicle.findOne({ vehicleNumber, _id: { $ne: vehicle._id } });
      if (existing) throw ApiError.conflict(`A vehicle with number ${vehicleNumber} already exists.`);
      vehicle.vehicleNumber = vehicleNumber;
    }
  }

  if (input.vehicleType !== undefined) vehicle.vehicleType = input.vehicleType.trim();
  if (input.model !== undefined) vehicle.model = input.model.trim();
  if (input.isActive !== undefined) vehicle.isActive = input.isActive;

  if (input.assignedDriverId !== undefined) {
    await assignDriverToVehicle(vehicle, input.assignedDriverId ?? null);
  }

  await vehicle.save();
  return getVehicleById(id);
}

export async function deleteVehicle(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid vehicle id.');

  const vehicle = await Vehicle.findById(id);
  if (!vehicle) throw ApiError.notFound('Vehicle not found.');

  const hasEntries = await FuelEntry.exists({ vehicleId: vehicle._id });
  if (hasEntries) {
    throw ApiError.conflict(
      'This vehicle has fuel entries recorded. Deactivate the vehicle instead of deleting, to preserve historical records.'
    );
  }

  await Driver.updateMany({ assignedVehicleId: vehicle._id }, { $set: { assignedVehicleId: null } });
  await vehicle.deleteOne();
}