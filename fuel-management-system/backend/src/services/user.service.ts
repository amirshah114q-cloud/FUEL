import bcrypt from 'bcryptjs';
import { FilterQuery, Types } from 'mongoose';
import User, { IUser, SafeUser, USER_ROLES, UserRole, toSafeUser } from '../models/user.model';
import Driver from '../models/driver.model';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../utils/regex';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export interface CreateUserInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  driverId?: string | null;
  isActive?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: UserRole;
  driverId?: string | null;
  isActive?: boolean;
}

export async function listUsers(query: Record<string, string | undefined>) {
  const { page, limit, skip } = parsePagination(query);
  const conditions: FilterQuery<IUser>[] = [];

  if (query.role) {
    if (!USER_ROLES.includes(query.role as UserRole)) {
      throw ApiError.badRequest(`Invalid role filter. Allowed values: ${USER_ROLES.join(', ')}.`);
    }
    conditions.push({ role: query.role });
  }

  if (query.isActive) {
    if (query.isActive !== 'true' && query.isActive !== 'false') {
      throw ApiError.badRequest('isActive filter must be "true" or "false".');
    }
    conditions.push({ isActive: query.isActive === 'true' });
  }

  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search.trim()), 'i');
    conditions.push({ $or: [{ name: rx }, { email: rx }, { phone: rx }] });
  }

  const filter: FilterQuery<IUser> = conditions.length ? { $and: conditions } : {};

  const [users, total] = await Promise.all([
    User.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  return {
    users: users.map(toSafeUser),
    pagination: buildPaginationMeta(page, limit, total)
  };
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const email = input.email.trim().toLowerCase();

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('A user with this email already exists.');

  let driverId: Types.ObjectId | null = null;
  if (input.role === 'driver') {
    if (!input.driverId) throw ApiError.badRequest('driverId is required for driver accounts.');
    const driver = await Driver.findById(input.driverId);
    if (!driver) throw ApiError.badRequest('Linked driver profile not found.');
    const linkedUser = await User.findOne({ driverId: input.driverId });
    if (linkedUser) throw ApiError.conflict('This driver is already linked to another user account.');
    driverId = driver._id;
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    name: input.name.trim(),
    email,
    phone: input.phone?.trim() ?? '',
    passwordHash,
    role: input.role,
    driverId,
    isActive: input.isActive ?? true
  });

  return toSafeUser(user);
}

export async function updateUser(
  userId: string,
  requesterId: string,
  input: UpdateUserInput
): Promise<SafeUser> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found.');

  if (input.email && input.email.trim().toLowerCase() !== user.email) {
    const email = input.email.trim().toLowerCase();
    const existing = await User.findOne({ email, _id: { $ne: user._id } });
    if (existing) throw ApiError.conflict('A user with this email already exists.');
    user.email = email;
  }

  if (input.name !== undefined) user.name = input.name.trim();
  if (input.phone !== undefined) user.phone = input.phone?.trim() ?? '';

  if (input.password) {
    user.passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
  }

  const newRole: UserRole = input.role ?? user.role;
  const newDriverId: string | null =
    input.driverId !== undefined
      ? input.driverId ?? null
      : user.driverId
        ? user.driverId.toString()
        : null;
  const newIsActive: boolean = input.isActive !== undefined ? input.isActive : user.isActive;

  // Self-protection: an admin cannot demote or deactivate their own account
  if (user._id.toString() === requesterId && (newRole !== user.role || newIsActive === false)) {
    throw ApiError.badRequest('You cannot change your own role or deactivate your own account.');
  }

  // Always keep at least one active administrator in the system
  if (user.role === 'admin' && (newRole !== 'admin' || newIsActive === false)) {
    const otherActiveAdmins = await User.countDocuments({
      role: 'admin',
      isActive: true,
      _id: { $ne: user._id }
    });
    if (otherActiveAdmins === 0) {
      throw ApiError.conflict(
        'At least one active administrator must remain. Promote another admin first.'
      );
    }
  }

  if (input.role !== undefined) user.role = newRole;

  if (newRole === 'driver') {
    if (!newDriverId) throw ApiError.badRequest('driverId is required for driver accounts.');
    const driver = await Driver.findById(newDriverId);
    if (!driver) throw ApiError.badRequest('Linked driver profile not found.');
    const linked = await User.findOne({ driverId: newDriverId, _id: { $ne: user._id } });
    if (linked) throw ApiError.conflict('This driver is already linked to another user account.');
    user.driverId = new Types.ObjectId(newDriverId);
  } else {
    user.driverId = null;
  }

  user.isActive = newIsActive;
  await user.save();

  return toSafeUser(user);
}

export async function deleteUser(userId: string, requesterId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found.');

  if (user._id.toString() === requesterId) {
    throw ApiError.badRequest('You cannot delete your own account.');
  }

  if (user.role === 'admin') {
    const otherActiveAdmins = await User.countDocuments({
      role: 'admin',
      isActive: true,
      _id: { $ne: user._id }
    });
    if (otherActiveAdmins === 0) {
      throw ApiError.conflict(
        'At least one active administrator must remain. Promote another admin first.'
      );
    }
  }

  await user.deleteOne();
}