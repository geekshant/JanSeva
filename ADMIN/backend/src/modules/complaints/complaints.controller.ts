import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { writeAudit } from '../../middleware/audit';
import * as service from './complaints.service';
import { findNearbyComplaints, findComplaintsInBounds, clusterComplaints } from './geospatial.service';

function actorOf(req: Request) {
  return { userId: req.user!.userId, role: req.user!.role as never };
}

export const createComplaintHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.createComplaint(actorOf(req), req.body);
  writeAudit(req, { action: 'complaint.create', entityType: 'complaints', entityId: result.complaint.id, after: { trackingCode: result.complaint.trackingCode } }, res);
  res.status(201).json(ApiResponse.ok(result, 'Complaint submitted'));
});

export const listComplaintsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listComplaints(actorOf(req), req.query as never);
  res.json(ApiResponse.paginated(result.items, result.meta, 'Complaints listed'));
});

export const listMyComplaintsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = { ...req.query, createdById: req.user!.userId };
  const result = await service.listComplaints(actorOf(req), query as never);
  res.json(ApiResponse.paginated(result.items, result.meta, 'My complaints'));
});

export const getComplaintHandler = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await service.getComplaint(req.params.id, { userId: req.user!.userId, role: req.user!.role as never });
  res.json(ApiResponse.ok(complaint, 'Complaint'));
});

export const getByTrackingCodeHandler = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await service.getComplaintByTrackingCode(req.params.code, req.user ? { userId: req.user.userId, role: req.user.role as never } : null);
  res.json(ApiResponse.ok(complaint, 'Complaint'));
});

export const updateComplaintHandler = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await service.updateComplaint(req.params.id, req.body, actorOf(req));
  writeAudit(req, { action: 'complaint.update', entityType: 'complaints', entityId: complaint.id, after: { status: complaint.status } }, res);
  res.json(ApiResponse.ok(complaint, 'Complaint updated'));
});

export const changeStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await service.changeStatus(req.params.id, req.body, actorOf(req));
  writeAudit(req, { action: 'complaint.change-status', entityType: 'complaints', entityId: complaint.id, after: { status: complaint.status } }, res);
  res.json(ApiResponse.ok(complaint, 'Status updated'));
});

export const assignComplaintHandler = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await service.assignComplaint(req.params.id, req.body, actorOf(req));
  writeAudit(req, { action: 'complaint.assign', entityType: 'complaints', entityId: complaint.id, after: { departmentId: req.body.departmentId, officerId: req.body.officerId } }, res);
  res.json(ApiResponse.ok(complaint, 'Complaint assigned'));
});

export const addCommentHandler = asyncHandler(async (req: Request, res: Response) => {
  const comment = await service.addComment(req.params.id, req.body, actorOf(req));
  writeAudit(req, { action: 'complaint.comment', entityType: 'complaints', entityId: req.params.id }, res);
  res.status(201).json(ApiResponse.ok(comment, 'Comment added'));
});

export const listCommentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const comments = await service.listComments(req.params.id, req.user ? { userId: req.user.userId, role: req.user.role as never } : null);
  res.json(ApiResponse.ok(comments, 'Comments'));
});

export const verifyComplaintHandler = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await service.verifyComplaint(req.params.id, req.body, actorOf(req));
  writeAudit(req, { action: 'complaint.verify', entityType: 'complaints', entityId: complaint.id, after: { status: complaint.status, result: req.body?.result } }, res);
  res.json(ApiResponse.ok(complaint, complaint.status === 'VERIFIED' ? 'Complaint verified' : 'Complaint reopened'));
});

export const reopenComplaintHandler = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await service.reopenComplaint(req.params.id, req.body?.note, actorOf(req));
  writeAudit(req, { action: 'complaint.reopen', entityType: 'complaints', entityId: complaint.id, after: { status: 'REOPENED' } }, res);
  res.json(ApiResponse.ok(complaint, 'Complaint reopened'));
});

export const addImagesHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.addImages(req.params.id, req.body.urls, actorOf(req));
  res.status(201).json(ApiResponse.ok(result, 'Images added'));
});

export const slaBreachesHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listSlaBreaches(req.query as never);
  res.json(ApiResponse.paginated(result.items, result.meta, 'SLA breaches'));
});

export const nearbyHandler = asyncHandler(async (req: Request, res: Response) => {
  const items = await findNearbyComplaints(req.query as never);
  res.json(ApiResponse.ok(items, 'Nearby complaints'));
});

export const mapBoundsHandler = asyncHandler(async (req: Request, res: Response) => {
  const items = await findComplaintsInBounds(req.query as never);
  res.json(ApiResponse.ok(items, 'Map complaints'));
});

export const clusterHandler = asyncHandler(async (req: Request, res: Response) => {
  const items = await clusterComplaints(req.query as never);
  res.json(ApiResponse.ok(items, 'Complaint clusters'));
});