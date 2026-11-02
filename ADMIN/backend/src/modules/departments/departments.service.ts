import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { ApiError } from '../../utils/ApiError';
import { buildMeta } from '../../utils/pagination';
import { isSlaOverdue } from '../../utils/sla';
import { CreateDepartmentInput, UpdateDepartmentInput } from './departments.schemas';

const includeMembers = {
  _count: { select: { members: true, complaints: true, assignments: true } },
} as const;

export async function listDepartments(includeStats = true) {
  const where = { isActive: true };
  const [items] = await Promise.all([
    prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
      include: includeStats ? includeMembers : undefined,
    }),
  ]);
  return items;
}

export async function getDepartment(id: string) {
  const dept = await prisma.department.findUnique({
    where: { id },
    include: { members: { select: { id: true, name: true, role: true } } },
  });
  if (!dept) throw ApiError.notFound('Department not found');
  return dept;
}

export async function listDepartmentComplaints(
  departmentId: string,
  query: { page: number; limit: number; status?: string; priority?: string },
) {
  await ensureExists(departmentId);

  const where: Prisma.ComplaintWhereInput = {
    assignedDepartmentId: departmentId,
    deletedAt: null,
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.priority ? { priority: query.priority as never } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedOfficer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return { items, meta: buildMeta(total, query.page, query.limit) };
}

export async function createDepartment(input: CreateDepartmentInput) {
  const existing = await prisma.department.findUnique({ where: { code: input.code } });
  if (existing) throw ApiError.conflict('Department code already taken', 'DEPT_CODE_EXISTS');

  return prisma.department.create({ data: input });
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput) {
  await ensureExists(id);
  return prisma.department.update({ where: { id }, data: input });
}

export async function removeDepartment(id: string) {
  await ensureExists(id);
  const usage = await prisma.complaint.count({
    where: { assignedDepartmentId: id, deletedAt: null },
  });
  if (usage > 0) {
    throw ApiError.badRequest(
      `Department still has ${usage} assigned complaint(s); reassign or delete them first`,
      'DEPARTMENT_IN_USE',
    );
  }
  await prisma.department.update({ where: { id }, data: { isActive: false } });
}

export async function departmentOverview() {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    include: { complaints: { where: { deletedAt: null }, select: { id: true, status: true, slaDueAt: true } } },
  });

  return departments.map((dept) => {
    const total = dept.complaints.length;
    const open = dept.complaints.filter((c) => {
      return !['RESOLVED', 'VERIFIED', 'REJECTED', 'DUPLICATE'].includes(c.status);
    }).length;
    const resolved = dept.complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'VERIFIED').length;
    const overdue = dept.complaints.filter((c) =>
      isSlaOverdue(c.status as never, c.slaDueAt),
    ).length;
    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      counts: { total, open, resolved, overdue },
    };
  });
}

async function ensureExists(id: string) {
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) throw ApiError.notFound('Department not found');
  return dept;
}