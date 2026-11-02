import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './analytics.service';

function daysOf(req: Request) {
  return { days: Number(req.query.days ?? 30) };
}

export const summaryHandler = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.getSummary();
  res.json(ApiResponse.ok(data, 'Analytics summary'));
});

export const categoriesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.getByCategory();
  res.json(ApiResponse.ok(data, 'Analytics by category'));
});

export const statusesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.getByStatus();
  res.json(ApiResponse.ok(data, 'Analytics by status'));
});

export const prioritiesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.getByPriority();
  res.json(ApiResponse.ok(data, 'Analytics by priority'));
});

export const departmentsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.getByDepartment();
  res.json(ApiResponse.ok(data, 'Analytics by department'));
});

export const trendsHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.getTrends(daysOf(req).days);
  res.json(ApiResponse.ok(data, 'Complaint trends'));
});

export const hotZonesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.getHotZones();
  res.json(ApiResponse.ok(data, 'Hot zones'));
});

export const fullHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.getFullAnalytics(daysOf(req));
  res.json(ApiResponse.ok(data, 'Full analytics'));
});