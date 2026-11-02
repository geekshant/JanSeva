import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './notifications.service';

export const listNotificationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listNotifications(req.user!.userId, req.query as never);
  res.json(ApiResponse.paginated(result.items, result.meta, 'Notifications listed'));
});

export const markReadHandler = asyncHandler(async (req: Request, res: Response) => {
  await service.markNotificationRead(req.params.id, req.user!.userId);
  res.json(ApiResponse.ok(null, 'Notification marked as read'));
});

export const markAllReadHandler = asyncHandler(async (req: Request, res: Response) => {
  const count = await service.markAllNotificationsRead(req.user!.userId);
  res.json(ApiResponse.ok({ count }, 'All notifications marked as read'));
});

export const registerDeviceTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  const device = await service.registerDeviceToken(
    req.user!.userId,
    req.body.token,
    req.body.platform,
  );
  res.status(201).json(ApiResponse.ok(device, 'Device registered for push notifications'));
});

export const unregisterDeviceTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  await service.unregisterDeviceToken(req.user!.userId, req.params.token);
  res.json(ApiResponse.ok(null, 'Device removed'));
});