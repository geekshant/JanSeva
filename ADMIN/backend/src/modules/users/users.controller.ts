import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { writeAudit } from '../../middleware/audit';
import * as service from './users.service';

export const listUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listUsers(req.query as never, req.user!);
  res.json(ApiResponse.paginated(result.items, result.meta, 'Users listed'));
});

export const getUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.getUserById(req.params.id);
  res.json(ApiResponse.ok(user, 'User'));
});

export const createUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.createUser(req.body);
  writeAudit(req, { action: 'user.create', entityType: 'users', entityId: user.id, after: { id: user.id, role: user.role } }, res);
  res.status(201).json(ApiResponse.ok(user, 'User created'));
});

export const updateUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const before = await service.getUserById(req.params.id);
  const user = await service.updateUser(req.params.id, req.body, req.user!);
  writeAudit(
    req,
    {
      action: 'user.update',
      entityType: 'users',
      entityId: user.id,
      before: { id: before.id, role: (before as { role?: string }).role },
      after: { id: user.id, role: user.role },
    },
    res,
  );
  res.json(ApiResponse.ok(user, 'User updated'));
});

export const deleteUserHandler = asyncHandler(async (req: Request, res: Response) => {
  await service.removeUser(req.params.id, req.user!.userId);
  writeAudit(req, { action: 'user.delete', entityType: 'users', entityId: req.params.id }, res);
  res.json(ApiResponse.ok(null, 'User deleted'));
});