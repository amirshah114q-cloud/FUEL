import mongoose, { Document, Schema, Types } from 'mongoose';

export const USER_ROLES = ['admin', 'accountant', 'driver'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface IUser extends Document<Types.ObjectId> {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  driverId: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  driverId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      required: [true, 'Role is required'],
      index: true
    },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', default: null },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

export function toSafeUser(user: IUser): SafeUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    driverId: user.driverId ? user.driverId.toString() : null,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export default mongoose.model<IUser>('User', userSchema);