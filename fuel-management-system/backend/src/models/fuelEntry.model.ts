import mongoose, { Document, Schema, Types } from 'mongoose';

export const FUEL_TYPES = ['Petrol', 'Diesel'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const FUEL_ENTRY_STATUSES = ['pending', 'verified', 'rejected'] as const;
export type FuelEntryStatus = (typeof FUEL_ENTRY_STATUSES)[number];

export interface IFuelEntry extends Document<Types.ObjectId> {
  driverId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  date: Date;
  time: string;
  petrolPumpName: string;
  vehicleNumber: string;
  fuelType: FuelType;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  receiptNumber: string;
  slipImageUrl: string;
  originalFileName: string;
  ocrRawText: string;
  ocrConfidence: number | null;
  status: FuelEntryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const fuelEntrySchema = new Schema<IFuelEntry>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: [true, 'Driver is required'], index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: [true, 'Vehicle is required'], index: true },
    date: { type: Date, required: [true, 'Fueling date is required'], index: true },
    time: { type: String, default: '' },
    petrolPumpName: { type: String, required: [true, 'Petrol pump name is required'], trim: true },
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true },
    fuelType: { type: String, enum: FUEL_TYPES, required: [true, 'Fuel type is required'] },
    liters: { type: Number, required: [true, 'Liters are required'], min: 0.001 },
    pricePerLiter: { type: Number, required: [true, 'Price per liter is required'], min: 0.001 },
    totalAmount: { type: Number, required: [true, 'Total amount is required'], min: 0.01 },
    receiptNumber: { type: String, required: [true, 'Receipt number is required'], trim: true, index: true },
    slipImageUrl: { type: String, default: '' },
    originalFileName: { type: String, default: '' },
    ocrRawText: { type: String, default: '' },
    ocrConfidence: { type: Number, default: null },
    status: { type: String, enum: FUEL_ENTRY_STATUSES, default: 'pending', index: true }
  },
  { timestamps: true }
);

fuelEntrySchema.index({ date: -1, createdAt: -1 });

export default mongoose.model<IFuelEntry>('FuelEntry', fuelEntrySchema);