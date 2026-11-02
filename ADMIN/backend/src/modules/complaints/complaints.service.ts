import { Prisma, ComplaintStatus, UserRole, ComplaintPriority } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { ApiError } from '../../utils/ApiError';
import { buildMeta } from '../../utils/pagination';
import { generateTrackingCode } from '../../utils/trackingCode';
import { computeSlaDeadline, evaluateSlaState, isSlaOverdue, DUE_SOON_MS } from '../../utils/sla';
import { SlaState } from '../../constants';
import { getBroadcaster, EVENTS } from '../realtime';
import { sendNotification } from '../notifications/notifications.service';
import { awardPoints } from '../rewards/rewards.service';
import { assertTransitionAllowed } from './status.rules';
import { nearestOrderRawRows } from './geospatial.order';
import {
  CreateComplaintInput,
  ListComplaintsQuery,
  UpdateComplaintInput,
  ChangeStatusInput,
  AssignComplaintInput,
  CreateCommentInput,
  VerifyComplaintInput,
} from './complaints.schemas';

export const COMPLAINT_INCLUDE = {
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  assignedDepartment: { select: { id: true, name: true, code: true } },
  assignedOfficer: { select: { id: true, name: true } },
  images: { orderBy: { sortOrder: 'asc' } },
  _count: { select: { comments: true } },
} as const;

const ACTIVE_STATUSES: ComplaintStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'];
const TERMINAL_STATUSES: ComplaintStatus[] = ['RESOLVED', 'VERIFIED', 'REJECTED', 'DUPLICATE'];

interface ComplaintActor {
  userId: string;
  role: UserRole;
}

export async function createComplaint(actor: ComplaintActor, input: CreateComplaintInput) {
  const trackingCode = await generateUniqueTrackingCode();
  const { slaHours, slaDueAt } = computeSlaDeadline(input.category);

  const isAnonymous = input.isAnonymous;
  const complaint = await prisma.complaint.create({
    data: {
      trackingCode,
      title: input.title,
      description: input.description,
      category: input.category,
      suggestedPriority: input.suggestedPriority,
      priority: input.suggestedPriority ?? 'MEDIUM',
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      ward: input.ward,
      isAnonymous: isAnonymous && actor.role === 'CITIZEN',
      createdById: actor.userId,
      slaDueAt,
      images: {
        create: input.imageUrls.map((url, index) => ({
          url,
          uploadedBy: actor.userId,
          sortOrder: index,
        })),
      },
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: 'SUBMITTED',
          changedById: actor.userId,
          note: 'Complaint submitted by citizen',
        },
      },
    },
    include: COMPLAINT_INCLUDE,
  });

  await sendNotification({
    userId: actor.userId,
    type: 'COMPLAINT_SUBMITTED',
    title: `Complaint ${complaint.trackingCode} submitted`,
    body: 'Your complaint has been submitted for review.',
    payload: { complaintId: complaint.id, trackingCode: complaint.trackingCode },
    complaintId: complaint.id,
  });

  await awardPoints({
    userId: actor.userId,
    rule: 'COMPLAINT_SUBMITTED',
    referenceId: `complaint:${complaint.id}:submitted`,
    complaintId: complaint.id,
  });
  if (input.imageUrls.length > 0) {
    await awardPoints({
      userId: actor.userId,
      rule: 'USEFUL_PHOTO',
      referenceId: `complaint:${complaint.id}:photo`,
      complaintId: complaint.id,
    });
  }

  getBroadcaster().toAdmins(EVENTS.complaintCreated, {
    complaintId: complaint.id,
    trackingCode,
    status: 'SUBMITTED',
    changedAt: new Date().toISOString(),
  });
  getBroadcaster().toUser(actor.userId, EVENTS.complaintCreated, {
    complaintId: complaint.id,
    trackingCode,
    status: 'SUBMITTED',
  });

  return { complaint, sla: { slaHours, slaDueAt, state: 'ON_TRACK' } };
}

async function generateUniqueTrackingCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateTrackingCode();
    const existing = await prisma.complaint.findUnique({ where: { trackingCode: code } });
    if (!existing) return code;
  }
  throw ApiError.conflict('Could not allocate a tracking code, please retry', 'TRACKING_EXHAUSTED');
}

export async function listComplaints(actor: ComplaintActor, query: ListComplaintsQuery) {
  const { page, limit } = query;

  const where = buildListWhere(query);
  const orderBy = buildListOrder(query, actor);

  let total = 0;
  let items;

  if (query.sort === 'nearest' && query.latitude !== undefined && query.longitude !== undefined) {
    const nearestQuery = {
      page: query.page,
      limit: query.limit,
      latitude: query.latitude,
      longitude: query.longitude,
    };
    const ids = await findNearestIdsPaged(where, nearestQuery);
    total = await prisma.complaint.count({ where });
    const rows =
      ids.length > 0
        ? await prisma.complaint.findMany({
            where: { id: { in: ids }, deletedAt: null },
            include: withSla(COMPLAINT_INCLUDE),
          })
        : [];
    // Restore the distance order produced by the raw query (Prisma returns
    // rows in no particular order) and attach slaState like the page path.
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => row !== undefined)
      .map((row) => ({ ...row, slaState: attachSlaState(row) }));
    items = ordered;
    return { items, meta: buildMeta(total, page, limit) };
  }

  const [count, rows] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      include: withSla(COMPLAINT_INCLUDE),
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  total = count;
  items = rows.map((c) => ({ ...c, slaState: attachSlaState(c) }));

  return { items, meta: buildMeta(total, page, limit) };
}

async function findNearestIdsPaged(
  where: Prisma.ComplaintWhereInput,
  query: { page: number; limit: number; latitude: number; longitude: number },
): Promise<string[]> {
  const rows = await nearestOrderRawRows({
    latitude: query.latitude,
    longitude: query.longitude,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    statuses: statusListFromWhere(where),
  });
  return rows.map((row) => row.id);
}

/**
 * Pull the status list out of a Prisma `where` so it can be replayed as
 * scalar enum placeholders in raw SQL.
 */
function statusListFromWhere(where: Prisma.ComplaintWhereInput): ComplaintStatus[] | undefined {
  const status = where.status as ComplaintStatus | { in?: ComplaintStatus[] } | undefined;
  if (!status) return undefined;
  if (typeof status === 'string') return [status];
  if (typeof status === 'object' && Array.isArray(status.in) && status.in.length > 0) {
    return status.in;
  }
  return undefined;
}

function buildListWhere(query: ListComplaintsQuery): Prisma.ComplaintWhereInput {
  const where: Prisma.ComplaintWhereInput = { deletedAt: null };

  if (query.status) {
    const statuses = String(query.status).split(',').map((s) => s.trim()) as ComplaintStatus[];
    where.status = { in: statuses };
  }
  if (query.category) where.category = query.category;
  if (query.priority) where.priority = query.priority as ComplaintPriority;
  if (query.departmentId) where.assignedDepartmentId = query.departmentId;
  if (query.officerId) where.assignedOfficerId = query.officerId;
  if (query.createdById) where.createdById = query.createdById;

  if (query.search) {
    const q = query.search;
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { trackingCode: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }

  if (query.sla) {
    const now = new Date();
    // Same DUE_SOON window that `evaluateSlaState` uses, so a complaint
    // surfaced by this filter is never reported as ON_TRACK.
    if (query.sla === 'OVERDUE') {
      where.slaDueAt = { lt: now };
      where.status = { in: ACTIVE_STATUSES };
    } else if (query.sla === 'DUE_SOON') {
      where.slaDueAt = { gte: now, lte: new Date(now.getTime() + DUE_SOON_MS) };
      where.status = { in: ACTIVE_STATUSES };
    } else {
      where.slaDueAt = { gt: new Date(now.getTime() + DUE_SOON_MS) };
      where.status = { in: ACTIVE_STATUSES };
    }
  }

  return where;
}

function buildListOrder(
  query: ListComplaintsQuery,
  _actor: ComplaintActor,
): Prisma.ComplaintOrderByWithRelationInput[] {
  if (query.sort === 'oldest') return [{ createdAt: 'asc' }];
  if (query.sort === 'nearest') return [{ createdAt: 'desc' }]; // replaced by raw ordering
  return [{ createdAt: 'desc' }];
}

/** Attach a computed slaState to each compliant for dashboards. */
export function withSla<T>(include: T): T {
  return include;
}

export function attachSlaState(item: { status: ComplaintStatus; slaDueAt: Date | null }): SlaState {
  return evaluateSlaState(item.status, item.slaDueAt);
}

export async function getComplaint(id: string, actor: ComplaintActor | null) {
  const complaint = await prisma.complaint.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...COMPLAINT_INCLUDE,
      comments: { orderBy: { createdAt: 'desc' }, take: 100 },
      statusHistory: { orderBy: { changedAt: 'asc' } },
      assignments: { orderBy: { assignedAt: 'desc' } },
      verifications: { orderBy: { verifiedAt: 'desc' } },
    },
  });
  if (!complaint) throw ApiError.notFound('Complaint not found');

  // Internal comments are only visible to officials & the department.
  const canSeeInternal = isOfficialActor(actor);
  const complaintWithFilteredComments = {
    ...complaint,
    slaState: attachSlaState(complaint),
    comments: complaint.comments.filter((c) => c.visibility === 'PUBLIC' || canSeeInternal),
  };
  return complaintWithFilteredComments;
}

export async function getComplaintByTrackingCode(code: string, actor: ComplaintActor | null) {
  const complaint = await prisma.complaint.findFirst({
    where: { trackingCode: code, deletedAt: null },
    include: {
      ...COMPLAINT_INCLUDE,
      statusHistory: { orderBy: { changedAt: 'asc' } },
      comments: { where: { visibility: 'PUBLIC' }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!complaint) throw ApiError.notFound('No complaint found for that tracking code');
  const complaintWithSla = { ...complaint, slaState: attachSlaState(complaint) };
  void actor;
  return complaintWithSla;
}

export async function updateComplaint(
  id: string,
  input: UpdateComplaintInput,
  actor: ComplaintActor,
) {
  const complaint = await findComplaintOrThrow(id);
  if (complaint.status === 'VERIFIED') {
    throw ApiError.badRequest('Cannot modify a verified complaint', 'COMPLAINT_LOCKED');
  }

  const updated = await prisma.complaint.update({
    where: { id },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.address ? { address: input.address } : {}),
      ...(input.ward !== undefined ? { ward: input.ward ?? null } : {}),
    },
    include: COMPLAINT_INCLUDE,
  });

  getBroadcaster().toAdmins(EVENTS.complaintUpdated, {
    complaintId: id,
    changedBy: actor.userId,
    changedAt: new Date().toISOString(),
  });
  return { ...updated, slaState: attachSlaState(updated) };
}

export async function changeStatus(
  id: string,
  input: ChangeStatusInput,
  actor: ComplaintActor,
) {
  const complaint = await findComplaintOrThrow(id);
  const isCreator = complaint.createdById === actor.userId;
  assertTransitionAllowed(complaint.status, input.toStatus, actor.role, { isCreator });

  if (input.toStatus === 'DUPLICATE' && !input.duplicateOfId) {
    throw ApiError.badRequest('duplicateOfId is required when status is DUPLICATE', 'DUPLICATE_TARGET_REQUIRED');
  }
  if (input.duplicateOfId) {
    const target = await prisma.complaint.findUnique({ where: { id: input.duplicateOfId } });
    if (!target) throw ApiError.notFound('Duplicate target complaint not found');
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.update({
      where: { id },
      data: {
        status: input.toStatus,
        statusChangedAt: now,
        lastStatusChangedById: actor.userId,
        ...(input.toStatus === 'RESOLVED' ? { resolvedAt: now, resolutionNote: input.resolutionNote ?? null } : {}),
        ...(input.toStatus === 'REJECTED' ? { rejectedReason: input.rejectedReason ?? null } : {}),
        ...(input.toStatus === 'DUPLICATE' ? { duplicateOfId: input.duplicateOfId ?? null } : {}),
        ...(input.resolutionProofUrls ? { resolutionProofUrls: input.resolutionProofUrls } : {}),
      },
      include: COMPLAINT_INCLUDE,
    });

    await tx.complaintStatusHistory.create({
      data: {
        complaintId: id,
        fromStatus: complaint.status,
        toStatus: input.toStatus,
        changedById: actor.userId,
        note: input.note,
      },
    });

    return result;
  });

  const notifType = mapStatusToNotifType(input.toStatus);
  await sendNotification({
    userId: complaint.createdById,
    type: notifType,
    title: `Status update: ${input.toStatus.replace('_', ' ')}`,
    body: input.note ?? `Your complaint ${complaint.trackingCode} moved to ${input.toStatus}`,
    payload: { complaintId: id, toStatus: input.toStatus, trackingCode: complaint.trackingCode },
    complaintId: id,
  });

  const broadcastPayload = {
    complaintId: id,
    trackingCode: complaint.trackingCode,
    status: input.toStatus,
    changedBy: actor.userId,
    changedAt: now.toISOString(),
  };
  getBroadcaster().toUser(complaint.createdById, EVENTS.statusChanged, broadcastPayload);
  getBroadcaster().toAdmins(EVENTS.statusChanged, broadcastPayload);
  getBroadcaster().toDepartment(complaint.assignedDepartmentId ?? '_none', EVENTS.statusChanged, broadcastPayload);

  return { ...updated, slaState: attachSlaState(updated) };
}

export async function assignComplaint(
  id: string,
  input: AssignComplaintInput,
  actor: ComplaintActor,
) {
  const complaint = await findComplaintOrThrow(id);
  if (['RESOLVED', 'VERIFIED', 'REJECTED', 'DUPLICATE'].includes(complaint.status)) {
    // Terminal / closed complaints must not be resurrected by an assignment:
    // doing so would silently flip them back to ASSIGNED.
    throw ApiError.badRequest('Cannot assign a closed complaint', 'COMPLAINT_LOCKED');
  }

  const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
  if (!dept) throw ApiError.notFound('Department not found');
  if (input.officerId) {
    const officer = await prisma.user.findFirst({
      where: { id: input.officerId, deletedAt: null, isActive: true },
    });
    if (!officer) throw ApiError.notFound('Officer not found');
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.update({
      where: { id },
      data: {
        assignedDepartmentId: input.departmentId,
        assignedOfficerId: input.officerId ?? null,
        status: 'ASSIGNED',
        statusChangedAt: now,
        lastStatusChangedById: actor.userId,
      },
      include: COMPLAINT_INCLUDE,
    });

    await tx.complaintAssignment.create({
      data: {
        complaintId: id,
        departmentId: input.departmentId,
        officerId: input.officerId,
        assignedById: actor.userId,
        note: input.note,
      },
    });

    await tx.complaintStatusHistory.create({
      data: {
        complaintId: id,
        fromStatus: complaint.status,
        toStatus: 'ASSIGNED',
        changedById: actor.userId,
        note: input.note ?? `Assigned to ${dept.name}`,
      },
    });

    return result;
  });

  await sendNotification({
    userId: complaint.createdById,
    type: 'COMPLAINT_ASSIGNED',
    title: `Assigned to ${dept.name}`,
    body: `Your complaint is now being handled by ${dept.name}.`,
    payload: { complaintId: id, departmentId: dept.id, trackingCode: complaint.trackingCode },
    complaintId: id,
  });
  if (input.officerId) {
    await sendNotification({
      userId: input.officerId,
      type: 'COMPLAINT_ASSIGNED',
      title: `New complaint assigned: ${complaint.trackingCode}`,
      body: complaint.title,
      payload: { complaintId: id, trackingCode: complaint.trackingCode },
      complaintId: id,
    });
  }

  getBroadcaster().toDepartment(dept.id, EVENTS.assigned, {
    complaintId: id,
    trackingCode: complaint.trackingCode,
    changedAt: now.toISOString(),
  });
  getBroadcaster().toUser(complaint.createdById, EVENTS.assigned, {
    complaintId: id,
    trackingCode: complaint.trackingCode,
  });

  return { ...updated, slaState: attachSlaState(updated) };
}

export async function addComment(
  id: string,
  input: CreateCommentInput,
  actor: ComplaintActor,
) {
  const complaint = await findComplaintOrThrow(id);
  const comment = await prisma.complaintComment.create({
    data: {
      complaintId: id,
      authorId: actor.userId,
      text: input.text,
      visibility: input.visibility,
    },
    include: { author: { select: { id: true, name: true, role: true } } },
  });

  if (input.visibility === 'PUBLIC' && actor.role === 'CITIZEN') {
    await awardPoints({
      userId: actor.userId,
      rule: 'HELPFUL_COMMENT',
      referenceId: `comment:${comment.id}`,
      complaintId: id,
    });
  }

  if (actor.role !== 'CITIZEN') {
    await sendNotification({
      userId: complaint.createdById,
      type: 'OFFICIAL_COMMENT',
      title: `Official comment on ${complaint.trackingCode}`,
      body: input.text.slice(0, 140),
      payload: { complaintId: id, trackingCode: complaint.trackingCode },
      complaintId: id,
    });
  }

  getBroadcaster().toAdmins(EVENTS.commentAdded, { complaintId: id, authorId: actor.userId });
  getBroadcaster().toUser(complaint.createdById, EVENTS.commentAdded, {
    complaintId: id,
    commentId: comment.id,
  });

  return comment;
}

export async function listComments(id: string, actor: ComplaintActor | null) {
  const complaint = await findComplaintOrThrow(id);
  const canSeeInternal = isOfficialActor(actor);
  const comments = await prisma.complaintComment.findMany({
    where: { complaintId: id },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, name: true, role: true, avatarUrl: true } } },
  });
  void complaint;
  return comments.filter((c) => c.visibility === 'PUBLIC' || canSeeInternal);
}

export async function verifyComplaint(
  id: string,
  input: VerifyComplaintInput,
  actor: ComplaintActor,
) {
  const complaint = await findComplaintOrThrow(id);
  if (complaint.status !== 'RESOLVED') {
    throw ApiError.badRequest('Only resolved complaints can be verified', 'NOT_RESOLVED');
  }
  if (actor.role === 'CITIZEN' && complaint.createdById !== actor.userId) {
    throw ApiError.forbidden('Only the author can verify this complaint');
  }
  const approved = input.result === 'VERIFIED';
  // A rejected verification sends the complaint back to the field instead of
  // closing it out, and awards no reputation points for the rejected claim.
  const nextStatus: ComplaintStatus = approved ? 'VERIFIED' : 'REOPENED';

  // Enforce the status transition matrix: VERIFIED may only be set by the
  // complaint author (CITIZEN) or a SYSTEM_ADMIN — not by officials or
  // department admins, who could otherwise self-verify complaints their own
  // department resolved. REOPENED follows the same author/admin rule.
  assertTransitionAllowed('RESOLVED', nextStatus, actor.role, {
    isCreator: complaint.createdById === actor.userId,
  });

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(approved ? { verifiedAt: now } : { reopenedAt: now }),
        statusChangedAt: now,
        lastStatusChangedById: actor.userId,
      },
      include: COMPLAINT_INCLUDE,
    });
    await tx.complaintVerification.create({
      data: {
        complaintId: id,
        verifiedById: actor.userId,
        result: input.result,
        notes: input.notes,
        proofUrls: input.proofUrls ?? [],
      },
    });
    await tx.complaintStatusHistory.create({
      data: {
        complaintId: id,
        fromStatus: 'RESOLVED',
        toStatus: nextStatus,
        changedById: actor.userId,
        note: input.notes,
      },
    });
    return result;
  });

  if (approved) {
    await awardPoints({
      userId: complaint.createdById,
      rule: 'RESOLUTION_VERIFIED',
      referenceId: `verified:${id}:${now.getTime()}`,
      complaintId: id,
    });
  }

  const event = approved ? EVENTS.verified : EVENTS.statusChanged;
  getBroadcaster().toAdmins(event, { complaintId: id, status: nextStatus, changedAt: now.toISOString() });
  getBroadcaster().toUser(complaint.createdById, event, { complaintId: id, status: nextStatus });

  return { ...updated, slaState: attachSlaState(updated) };
}

export async function reopenComplaint(
  id: string,
  note: string | undefined,
  actor: ComplaintActor,
) {
  const complaint = await findComplaintOrThrow(id);
  if (complaint.status !== 'RESOLVED') {
    throw ApiError.badRequest('Only resolved complaints can be reopened', 'NOT_RESOLVED');
  }
  if (actor.role === 'CITIZEN' && complaint.createdById !== actor.userId) {
    throw ApiError.forbidden('Only the author can reopen this complaint');
  }
  // Same matrix as a rejected verification: only the author (CITIZEN) or an
  // admin may push a resolved complaint back into the field.
  assertTransitionAllowed('RESOLVED', 'REOPENED', actor.role, {
    isCreator: complaint.createdById === actor.userId,
  });

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.update({
      where: { id },
      data: { status: 'REOPENED', reopenedAt: now, statusChangedAt: now, lastStatusChangedById: actor.userId },
      include: COMPLAINT_INCLUDE,
    });
    await tx.complaintStatusHistory.create({
      data: {
        complaintId: id,
        fromStatus: 'RESOLVED',
        toStatus: 'REOPENED',
        changedById: actor.userId,
        note: note ?? 'Citizen reopened the complaint — the issue is not resolved.',
      },
    });
    return result;
  });

  await sendNotification({
    userId: complaint.createdById,
    type: 'REOPENED',
    title: `Complaint ${complaint.trackingCode} reopened`,
    body: 'The resolution was not confirmed. The complaint is back in progress.',
    payload: { complaintId: id, trackingCode: complaint.trackingCode },
    complaintId: id,
  });

  getBroadcaster().toAdmins(EVENTS.statusChanged, {
    complaintId: id,
    trackingCode: complaint.trackingCode,
    status: 'REOPENED',
    changedBy: actor.userId,
    changedAt: now.toISOString(),
  });

  return { ...updated, slaState: attachSlaState(updated) };
}

export async function addImages(id: string, urls: string[], actor: ComplaintActor) {
  await findComplaintOrThrow(id);
  const existing = await prisma.complaintImage.count({ where: { complaintId: id } });
  if (existing + urls.length > 5) {
    throw ApiError.badRequest('A complaint can hold at most 5 images', 'IMAGE_LIMIT');
  }
  const images = await prisma.complaintImage.createMany({
    data: urls.map((url, index) => ({
      complaintId: id,
      url,
      uploadedBy: actor.userId,
      sortOrder: existing + index,
    })),
  });
  return images;
}

export async function removeImage(id: string, complaintId: string) {
  await prisma.complaintImage.deleteMany({
    where: { id, complaintId },
  });
}

export async function listSlaBreaches(query: { page?: number; limit?: number }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where: Prisma.ComplaintWhereInput = {
    deletedAt: null,
    slaDueAt: { lt: new Date() },
    status: { in: ACTIVE_STATUSES },
  };
  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      include: COMPLAINT_INCLUDE,
      orderBy: { slaDueAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.complaint.count({ where }),
  ]);
  return {
    items: items.map((c) => ({
      ...c,
      slaState: attachSlaState(c),
      overdueByHours: hoursLate(c),
    })),
    meta: buildMeta(total, page, limit),
  };
}

function hoursLate(c: { slaDueAt: Date }): number {
  return Math.max(0, Math.round((Date.now() - c.slaDueAt.getTime()) / 3_600_000));
}

async function findComplaintOrThrow(id: string) {
  const complaint = await prisma.complaint.findFirst({ where: { id, deletedAt: null } });
  if (!complaint) throw ApiError.notFound('Complaint not found');
  return complaint;
}

function isOfficialActor(actor: ComplaintActor | null): boolean {
  if (!actor) return false;
  return ['OFFICIAL', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
}

function mapStatusToNotifType(status: ComplaintStatus) {
  switch (status) {
    case 'RESOLVED':
      return 'MARKED_RESOLVED' as const;
    case 'REJECTED':
      return 'REJECTED' as const;
    case 'DUPLICATE':
      return 'DUPLICATE' as const;
    case 'REOPENED':
      return 'REOPENED' as const;
    default:
      return 'STATUS_CHANGED' as const;
  }
}

export { isSlaOverdue, TERMINAL_STATUSES };