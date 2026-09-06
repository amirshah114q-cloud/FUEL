import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { env } from '../config/env';
import { connectDB } from '../config/db';
import User from '../models/user.model';
import Driver from '../models/driver.model';
import Vehicle from '../models/vehicle.model';
import FuelEntry, { FuelType } from '../models/fuelEntry.model';
import { getUploadsPath } from '../middleware/upload';
import { round2 } from '../utils/number';
import { logger } from '../utils/logger';

/* ---------------------------------------------------------------------------
 * Minimal PNG generator (1x1 gray pixel) so seeded fuel entries point to a
 * real slip image file on disk.
 * ------------------------------------------------------------------------- */
function crc32(buffer: Buffer): number {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buffer) crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function createPlaceholderPng(): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]); // 1x1, 8-bit, RGB
  const scanline = Buffer.from([0x00, 0x88, 0x88, 0x88]); // filter byte + gray pixel
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', zlib.deflateSync(scanline)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

interface SampleEntry {
  daysAgo: number;
  driverIndex: number;
  fuelType: FuelType;
  liters: number;
  pricePerLiter: number;
  pump: string;
  receipt: string;
  time: string;
}

const sampleEntries: SampleEntry[] = [
  { daysAgo: 27, driverIndex: 0, fuelType: 'Diesel', liters: 60.0, pricePerLiter: 287.5, pump: 'PSO Petrol Pump – MA Jinnah Road', receipt: 'RCP-90211', time: '08:42' },
  { daysAgo: 25, driverIndex: 1, fuelType: 'Diesel', liters: 55.0, pricePerLiter: 287.5, pump: 'Shell Select – Korangi', receipt: 'RCP-90214', time: '09:10' },
  { daysAgo: 23, driverIndex: 2, fuelType: 'Diesel', liters: 70.0, pricePerLiter: 285.9, pump: 'Total Parco – University Road', receipt: 'RCP-90220', time: '07:55' },
  { daysAgo: 20, driverIndex: 0, fuelType: 'Diesel', liters: 58.5, pricePerLiter: 286.0, pump: 'PSO Petrol Pump – MA Jinnah Road', receipt: 'RCP-90231', time: '16:20' },
  { daysAgo: 18, driverIndex: 1, fuelType: 'Petrol', liters: 40.0, pricePerLiter: 262.4, pump: 'Caltex – Shahrah-e-Faisal', receipt: 'RCP-90238', time: '11:35' },
  { daysAgo: 15, driverIndex: 2, fuelType: 'Diesel', liters: 65.25, pricePerLiter: 287.1, pump: 'Total Parco – University Road', receipt: 'RCP-90245', time: '13:05' },
  { daysAgo: 12, driverIndex: 0, fuelType: 'Diesel', liters: 62.0, pricePerLiter: 288.0, pump: 'Shell Select – Korangi', receipt: 'RCP-90250', time: '10:15' },
  { daysAgo: 9, driverIndex: 1, fuelType: 'Diesel', liters: 52.75, pricePerLiter: 288.0, pump: 'PSO Petrol Pump – MA Jinnah Road', receipt: 'RCP-90259', time: '08:05' },
  { daysAgo: 5, driverIndex: 2, fuelType: 'Diesel', liters: 68.0, pricePerLiter: 289.3, pump: 'Total Parco – University Road', receipt: 'RCP-90266', time: '17:40' },
  { daysAgo: 2, driverIndex: 0, fuelType: 'Diesel', liters: 59.0, pricePerLiter: 289.3, pump: 'Shell Select – Korangi', receipt: 'RCP-90274', time: '09:50' }
];

async function seed(): Promise<void> {
  await connectDB();

  logger.info('Clearing existing collections (development seed)...');
  await Promise.all([
    User.deleteMany({}),
    Driver.deleteMany({}),
    Vehicle.deleteMany({}),
    FuelEntry.deleteMany({})
  ]);

  logger.info('Creating vehicles...');
  const vehicles = await Vehicle.create([
    { vehicleNumber: 'KHI-1234', vehicleType: 'Van', model: 'Suzuki Bolan 2022' },
    { vehicleNumber: 'LHR-5678', vehicleType: 'Pickup', model: 'Toyota Hilux 2021' },
    { vehicleNumber: 'ISB-9012', vehicleType: 'Truck', model: 'Isuzu NPR 2020' }
  ]);

  logger.info('Creating drivers and linking vehicles...');
  const drivers = await Driver.create([
    { name: 'Ahmed Khan', phone: '+92-300-1111111', employeeId: 'EMP-DRV-001', assignedVehicleId: vehicles[0]._id },
    { name: 'Rashid Ali', phone: '+92-300-2222222', employeeId: 'EMP-DRV-002', assignedVehicleId: vehicles[1]._id },
    { name: 'Bilal Hussain', phone: '+92-300-3333333', employeeId: 'EMP-DRV-003', assignedVehicleId: vehicles[2]._id }
  ]);
  for (let i = 0; i < vehicles.length; i++) {
    vehicles[i].assignedDriverId = drivers[i]._id;
    await vehicles[i].save();
  }

  logger.info('Creating user accounts...');
  const adminHash = await bcrypt.hash('Admin@123', env.BCRYPT_SALT_ROUNDS);
  const accountantHash = await bcrypt.hash('Account@123', env.BCRYPT_SALT_ROUNDS);
  const driverHash = await bcrypt.hash('Driver@123', env.BCRYPT_SALT_ROUNDS);

  await User.create([
    { name: 'Imran Sheikh', email: 'admin@fleet.dev', phone: '+92-300-0000001', passwordHash: adminHash, role: 'admin' },
    { name: 'Sana Malik', email: 'accountant@fleet.dev', phone: '+92-300-0000002', passwordHash: accountantHash, role: 'accountant' },
    { name: 'Ahmed Khan', email: 'ahmed.driver@fleet.dev', phone: drivers[0].phone, passwordHash: driverHash, role: 'driver', driverId: drivers[0]._id },
    { name: 'Rashid Ali', email: 'rashid.driver@fleet.dev', phone: drivers[1].phone, passwordHash: driverHash, role: 'driver', driverId: drivers[1]._id },
    { name: 'Bilal Hussain', email: 'bilal.driver@fleet.dev', phone: drivers[2].phone, passwordHash: driverHash, role: 'driver', driverId: drivers[2]._id }
  ]);

  logger.info('Creating sample fuel entries with slip images...');
  const uploadsDir = getUploadsPath();
  fs.mkdirSync(uploadsDir, { recursive: true });
  for (const file of fs.readdirSync(uploadsDir)) {
    if (file.startsWith('sample-slip-')) {
      fs.unlinkSync(path.join(uploadsDir, file));
    }
  }
  const placeholderPng = createPlaceholderPng();

  let index = 1;
  for (const sample of sampleEntries) {
    const driver = drivers[sample.driverIndex];
    const vehicle = vehicles[sample.driverIndex];
    const fileName = `sample-slip-${index}.png`;
    fs.writeFileSync(path.join(uploadsDir, fileName), placeholderPng);

    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - sample.daysAgo);

    await FuelEntry.create({
      driverId: driver._id,
      vehicleId: vehicle._id,
      date,
      time: sample.time,
      petrolPumpName: sample.pump,
      vehicleNumber: vehicle.vehicleNumber,
      fuelType: sample.fuelType,
      liters: sample.liters,
      pricePerLiter: sample.pricePerLiter,
      totalAmount: round2(sample.liters * sample.pricePerLiter),
      receiptNumber: sample.receipt,
      slipImageUrl: `/uploads/${fileName}`,
      originalFileName: fileName,
      ocrRawText: '',
      ocrConfidence: null,
      status: 'verified'
    });
    index++;
  }

  logger.info('──────────────────────────────────────────────────');
  logger.info('✅ Seed complete!');
  logger.info('DEVELOPMENT-ONLY credentials (never use in production):');
  logger.info('  Admin       → admin@fleet.dev          / Admin@123');
  logger.info('  Accountant  → accountant@fleet.dev     / Account@123');
  logger.info('  Driver 1    → ahmed.driver@fleet.dev   / Driver@123');
  logger.info('  Driver 2    → rashid.driver@fleet.dev  / Driver@123');
  logger.info('  Driver 3    → bilal.driver@fleet.dev   / Driver@123');
  logger.info(`Data: 5 users, 3 drivers, 3 vehicles, ${sampleEntries.length} fuel entries`);
  logger.info('──────────────────────────────────────────────────');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((error) => {
  logger.error('Seeding failed:', { message: error instanceof Error ? error.message : String(error) });
  mongoose.connection.close(false, () => process.exit(1));
});