import { Response } from 'express';
import { AuthRequest } from '../types';
import * as userService from '../services/user.service';
import { getQueryParams } from '../utils/query';

export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  const result = await userService.listUsers(getQueryParams(req));
  res.status(200).json({ success: true, data: result.users, meta: result.pagination });
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  const user = await userService.createUser(req.body);
  res.status(201).json({ success: true, message: 'User created successfully.', data: user });
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const user = await userService.updateUser(req.params.id, req.user!._id.toString(), req.body);
  res.status(200).json({ success: true, message: 'User updated successfully.', data: user });
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  await userService.deleteUser(req.params.id, req.user!._id.toString());
  res.status(200).json({ success: true, message: 'User deleted successfully.' });
}