import { FilterQuery, Types } from 'mongoose';
import Driver, { IDriver } from '../models/driver.model';
import Vehicle, { IVehicle } from '../models/vehicle.model';
import User from '../models/user.model';
import FuelEntry from '../models/fuelEntry.model';
import { assignVehicleToDriver } from './fleet.service';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../utils/regex';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export interface DriverDTO {
  id: string;
  name: string;
  phone: string;
  employeeId: string;
  isActive: boolean;
  assignedVehicle: {
    id: string;
    vehicleNumber: string;
    vehicleType: string;
    model: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverInput {
  name: string;
  phone: string;
  employeeId: string;
  assignedVehicleId?: string | null;
  isActive?: boolean;
}

export interface UpdateDriverInput {
  name?: string;
  phone?: string;
  employeeId?: string;
  assignedVehicleId?: string | null;
  isActive?: boolean;
}

export function toDriverDTO(driver: IDriver, vehicle: IVehicle | null): DriverDTO {
  return {
    id: driver._id.toString(),
    name: driver.name,
    phone: driver.phone,
    employeeId: driver.employeeId,
    isActive: driver.isActive,
    assignedVehicle: vehicle
      ? {
          id: vehicle._id.toString(),
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          model: vehicle.model
        }
      : null,
    createdAt: driver.createdAt.toISOString(),
    updatedAt: driver.updatedAt.toISOString()
  };
}

export async function listDrivers(query: Record<string, string | undefined>) {
  const { page, limit, skip } = parsePagination(query);
  const conditions: FilterQuery<IDriver>[] = [];

  if (query.isActive) {
    if (query.isActive !== 'true' && query.isActive !== 'false') {
      throw ApiError.badRequest('isActive filter must be "true" or "false".');
    }
    conditions.push({ isActive: query.isActive === 'true' });
  }

  if (query.assignedVehicleId) {
    if (!Types.ObjectId.isValid(query.assignedVehicleId)) {
      throw ApiError.badRequest('Invalid assignedVehicleId filter.');
    }
    conditions.push({ assignedVehicleId: new Types.ObjectId(query.assignedVehicleId) });
  }

  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search.trim()), 'i');
    conditions.push({ $or: [{ name: rx }, { phone: rx }, { employeeId: rx }] });
  }

  const filter: FilterQuery<IDriver> = conditions.length ? { $and: conditions } : {};

  const [drivers, total] = await Promise.all([
    Driver.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedVehicleId', 'vehicleNumber vehicleType model'),
    Driver.countDocuments(filter)
  ]);

  const dtos = drivers.map((driver) =>
    toDriverDTO(driver, driver.assignedVehicleId as unknown as IVehicle | null)
  );

  return { drivers: dtos, pagination: buildPaginationMeta(page, limit, total) };
}

export async function getDriverById(id: string): Promise<DriverDTO> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid driver id.');

  const driver = await Driver.findById(id).populate(
    'assignedVehicleId',
    'vehicleNumber vehicleType model'
  );
  if (!driver) throw ApiError.notFound('Driver not found.');

  return toDriverDTO(driver, driver.assignedVehicleId as unknown as IVehicle | null);
}

export async function createDriver(input: CreateDriverInput): Promise<DriverDTO> {
  const employeeId = input.employeeId.trim().toUpperCase();
  const existing = await Driver.findOne({ employeeId });
  if (existing) throw ApiError.conflict('A driver with this employee ID already exists.');

  const driver = new Driver({
    name: input.name.trim(),
    phone: input.phone.trim(),
    employeeId,
    isActive: input.isActive ?? true,
    assignedVehicleId: null
  });

  if (input.assignedVehicleId) {
    await assignVehicleToDriver(driver, input.assignedVehicleId);
  }

  await driver.save();
  return getDriverById(driver._id.toString());
}

export async function updateDriver(id: string, input: UpdateDriverInput): Promise<DriverDTO> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid driver id.');

  const driver = await Driver.findById(id);
  if (!driver) throw ApiError.notFound('Driver not found.');

  if (input.employeeId !== undefined) {
    const employeeId = input.employeeId.trim().toUpperCase();
    const existing = await Driver.findOne({ employeeId, _id: { $ne: driver._id } });
    if (existing) throw ApiError.conflict('A driver with this employee ID already exists.');
    driver.employeeId = employeeId;
  }

  if (input.name !== undefined) driver.name = input.name.trim();
  if (input.phone !== undefined) driver.phone = input.phone.trim();

  if (input.isActive !== undefined) {
    driver.isActive = input.isActive;
    // Keep linked login accounts in sync with the driver's employment status
    await User.updateMany({ driverId: driver._id }, { $set: { isActive: input.isActive } });
  }

  if (input.assignedVehicleId !== undefined) {
    await assignVehicleToDriver(driver, input.assignedVehicleId ?? null);
  }

  await driver.save();
  return getDriverById(id);
}

export async function deleteDriver(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid driver id.');

  const driver = await Driver.findById(id);
  if (!driver) throw ApiError.notFound('Driver not found.');

  const hasEntries = await FuelEntry.exists({ driverId: driver._id });
  if (hasEntries) {
    throw ApiError.conflict(
      'This driver has fuel entries recorded. Deactivate the driver instead of deleting, to preserve historical records.'
    );
  }

  await Vehicle.updateMany({ assignedDriverId: driver._id }, { $set: { assignedDriverId: null } });
  await User.updateMany(
    { driverId: driver._id },
    { $set: { driverId: null, isActive: false } }
  );

  await driver.deleteOne();
}