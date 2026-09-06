import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVehicle extends Document<Types.ObjectId> {
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  assignedDriverId: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    vehicleType: { type: String, required: [true, 'Vehicle type is required'], trim: true, maxlength: 50 },
    model: { type: String, required: [true, 'Vehicle model is required'], trim: true, maxlength: 100 },
    assignedDriverId: { type: Schema.Types.ObjectId, ref: 'Driver', default: null },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

vehicleSchema.index({ assignedDriverId: 1 });

export default mongoose.model<IVehicle>('Vehicle', vehicleSchema);