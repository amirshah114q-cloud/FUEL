import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDriver extends Document<Types.ObjectId> {
  name: string;
  phone: string;
  employeeId: string;
  assignedVehicleId: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const driverSchema = new Schema<IDriver>(
  {
    name: { type: String, required: [true, 'Driver name is required'], trim: true, maxlength: 100 },
    phone: { type: String, required: [true, 'Driver phone is required'], trim: true },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    assignedVehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

driverSchema.index({ assignedVehicleId: 1 });

export default mongoose.model<IDriver>('Driver', driverSchema);