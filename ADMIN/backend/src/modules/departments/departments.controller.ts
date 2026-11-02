import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { writeAudit } from '../../middleware/audit';
import * as service from './departments.service';

export const listDepartmentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const includeStats = req.query.includeStats !== 'false';
  const items = await service.listDepartments(includeStats);
  res.json(ApiResponse.ok(items, 'Departments listed'));
});

export const getDepartmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const dept = await service.getDepartment(req.params.id);
  res.json(ApiResponse.ok(dept, 'Department'));
});

export const departmentComplaintsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listDepartmentComplaints(req.params.id, req.query as never);
  res.json(ApiResponse.paginated(result.items, result.meta, 'Department complaints'));
});

export const createDepartmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const dept = await service.createDepartment(req.body);
  writeAudit(req, { action: 'department.create', entityType: 'departments', entityId: dept.id, after: { code: dept.code } }, res);
  res.status(201).json(ApiResponse.ok(dept, 'Department created'));
});

export const updateDepartmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const dept = await service.updateDepartment(req.params.id, req.body);
  writeAudit(req, { action: 'department.update', entityType: 'departments', entityId: dept.id }, res);
  res.json(ApiResponse.ok(dept, 'Department updated'));
});

export const deleteDepartmentHandler = asyncHandler(async (req: Request, res: Response) => {
  await service.removeDepartment(req.params.id);
  writeAudit(req, { action: 'department.delete', entityType: 'departments', entityId: req.params.id }, res);
  res.json(ApiResponse.ok(null, 'Department deactivated'));
});

export const departmentOverviewHandler = asyncHandler(async (_req: Request, res: Response) => {
  const overview = await service.departmentOverview();
  res.json(ApiResponse.ok(overview, 'Department overview'));
});