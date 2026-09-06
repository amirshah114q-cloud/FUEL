import { Types } from 'mongoose';
import Driver, { IDriver } from '../models/driver.model';
import Vehicle, { IVehicle } from '../models/vehicle.model';
import { ApiError } from '../utils/ApiError';

/**
 * Assigns (or unassigns, when vehicleId is null) a vehicle to a driver and
 * keeps both sides of the relationship in sync (1 driver ↔ 1 vehicle).
 */
export async function assignVehicleToDriver(
  driver: IDriver,
  vehicleId: string | null
): Promise<void> {
  const oldVehicleId = driver.assignedVehicleId ? driver.assignedVehicleId.toString() : null;
  const newVehicleId = vehicleId ? vehicleId.trim() : null;

  if (newVehicleId && !Types.ObjectId.isValid(newVehicleId)) {
    throw ApiError.badRequest('Invalid vehicle id format.');
  }

  // Release the driver's previous vehicle (if it is changing)
  if (oldVehicleId && oldVehicleId !== newVehicleId) {
    await Vehicle.updateOne(
      { _id: oldVehicleId, assignedDriverId: driver._id },
      { $set: { assignedDriverId: null } }
    );
  }

  if (newVehicleId) {
    const vehicle = await Vehicle.findById(newVehicleId);
    if (!vehicle) throw ApiError.badRequest('Assigned vehicle not found.');
    if (!vehicle.isActive) throw ApiError.badRequest('The selected vehicle is inactive.');

    // Detach any other driver currently holding this vehicle
    await Driver.updateMany(
      { assignedVehicleId: newVehicleId, _id: { $ne: driver._id } },
      { $set: { assignedVehicleId: null } }
    );

    vehicle.assignedDriverId = driver._id;
    await vehicle.save();
  }

  driver.assignedVehicleId = newVehicleId ? new Types.ObjectId(newVehicleId) : null;
}

/**
 * Assigns (or unassigns, when driverId is null) a driver to a vehicle and
 * keeps both sides of the relationship in sync.
 */
export async function assignDriverToVehicle(
  vehicle: IVehicle,
  driverId: string | null
): Promise<void> {
  const oldDriverId = vehicle.assignedDriverId ? vehicle.assignedDriverId.toString() : null;
  const newDriverId = driverId ? driverId.trim() : null;

  if (newDriverId && !Types.ObjectId.isValid(newDriverId)) {
    throw ApiError.badRequest('Invalid driver id format.');
  }

  if (oldDriverId && oldDriverId !== newDriverId) {
    await Driver.updateOne(
      { _id: oldDriverId, assignedVehicleId: vehicle._id },
      { $set: { assignedVehicleId: null } }
    );
  }

  if (newDriverId) {
    const driver = await Driver.findById(newDriverId);
    if (!driver) throw ApiError.badRequest('Assigned driver not found.');
    if (!driver.isActive) throw ApiError.badRequest('The selected driver is inactive.');

    // Detach any other vehicle currently held by this driver
    await Vehicle.updateMany(
      { assignedDriverId: newDriverId, _id: { $ne: vehicle._id } },
      { $set: { assignedDriverId: null } }
    );

    driver.assignedVehicleId = vehicle._id;
    await driver.save();
  }

  vehicle.assignedDriverId = newDriverId ? new Types.ObjectId(newDriverId) : null;
}