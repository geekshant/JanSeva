import { prisma } from '../../db/prisma';

export interface TrendBucket {
  date: string;
  submitted: number;
  resolved: number;
}

export async function getSummary() {
  const now = new Date();
  const slaSoon = new Date(now.getTime() + 0.2 * 168 * 60 * 60 * 1000);

  // Single query replaces 4 complaint counts + 3 SLA counts + 1 avg-resolution
  // query (8 round-trips → 1). The user count is a separate table, so it runs
  // in parallel.
  const [stats, citizens] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        total: bigint;
        open: bigint;
        resolved: bigint;
        rejected: bigint;
        overdue: bigint;
        due_soon: bigint;
        on_track: bigint;
        avg_hours: number | null;
      }>
    >`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')) AS open,
        COUNT(*) FILTER (WHERE status IN ('RESOLVED','VERIFIED')) AS resolved,
        COUNT(*) FILTER (WHERE status IN ('REJECTED','DUPLICATE')) AS rejected,
        COUNT(*) FILTER (WHERE status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED') AND "slaDueAt" < ${now}) AS overdue,
        COUNT(*) FILTER (WHERE status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED') AND "slaDueAt" >= ${now} AND "slaDueAt" <= ${slaSoon}) AS due_soon,
        COUNT(*) FILTER (WHERE status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED') AND "slaDueAt" > ${slaSoon}) AS on_track,
        AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600.0) AS avg_hours
      FROM "public"."complaints"
      WHERE "deletedAt" IS NULL
    `,
    prisma.user.count({ where: { role: 'CITIZEN', deletedAt: null } }),
  ]);

  const s = stats[0]!;
  const total = Number(s.total);
  const resolved = Number(s.resolved);
  const avgHours = s.avg_hours;

  return {
    total,
    open: Number(s.open),
    resolved,
    rejected: Number(s.rejected),
    citizens,
    resolutionRate: total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0,
    avgResolutionHours:
      avgHours === null || avgHours === undefined ? null : Math.round(avgHours * 10) / 10,
    sla: {
      overdue: Number(s.overdue),
      dueSoon: Number(s.due_soon),
      onTrack: Number(s.on_track),
    },
  };
}

export async function getByCategory() {
  const rows = await prisma.complaint.groupBy({
    by: ['category'],
    where: { deletedAt: null },
    _count: { _all: true },
    orderBy: { _count: { category: 'desc' } },
  });
  return rows.map((r) => ({ category: r.category, count: r._count._all }));
}

export async function getByStatus() {
  const rows = await prisma.complaint.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

export async function getByPriority() {
  const rows = await prisma.complaint.groupBy({
    by: ['priority'],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  return rows.map((r) => ({ priority: r.priority, count: r._count._all }));
}

export async function getByDepartment() {
  const rows = await prisma.complaint.groupBy({
    by: ['assignedDepartmentId'],
    where: { deletedAt: null, assignedDepartmentId: { not: null } },
    _count: { _all: true },
  });
  const grouped = rows.map((r) => ({ departmentId: r.assignedDepartmentId as string, count: r._count._all }));

  const deptIds = grouped.map((g) => g.departmentId);
  const departments = await prisma.department.findMany({
    where: { id: { in: deptIds } },
    select: { id: true, name: true, code: true },
  });
  const nameById = new Map(departments.map((d) => [d.id, d]));

  return grouped
    .map((g) => ({ ...nameById.get(g.departmentId), count: g.count }))
    .sort((a, b) => b.count - a.count);
}

export async function getTrends(days: number): Promise<TrendBucket[]> {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<
    Array<{ day: Date; submitted: bigint; resolved: bigint }>
  >`
    SELECT
      day,
      COALESCE(submitted, 0) AS submitted,
      COALESCE(resolved, 0) AS resolved
    FROM generate_series(
      date_trunc('day', ${from}::timestamptz),
      date_trunc('day', now()),
      interval '1 day'
    ) AS days(day)
    LEFT JOIN (
      SELECT date_trunc('day', "createdAt"::timestamptz) AS d, COUNT(*) AS submitted
      FROM "public"."complaints" WHERE "deletedAt" IS NULL AND "createdAt" >= ${from}
      GROUP BY 1
    ) s ON s.d = days.day
    LEFT JOIN (
      SELECT date_trunc('day', "resolvedAt"::timestamptz) AS d, COUNT(*) AS resolved
      FROM "public"."complaints" WHERE "deletedAt" IS NULL AND "resolvedAt" IS NOT NULL AND "resolvedAt" >= ${from}
      GROUP BY 1
    ) r ON r.d = days.day
    ORDER BY day ASC
  `;

  return rows.map((r) => ({
    date: r.day.toISOString().slice(0, 10),
    submitted: Number(r.submitted),
    resolved: Number(r.resolved),
  }));
}

export async function getTopWards(limit = 10) {
  const rows = await prisma.complaint.groupBy({
    by: ['ward'],
    where: { deletedAt: null, ward: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { ward: 'desc' } },
    take: limit,
  });
  return rows.map((r) => ({ ward: r.ward, count: r._count._all }));
}

export async function getHotZones() {
  const rows = await prisma.$queryRaw<
    Array<{ latitude: number; longitude: number; count: bigint }>
  >`
    SELECT
      ROUND("latitude"::numeric, 3)::double precision AS latitude,
      ROUND("longitude"::numeric, 3)::double precision AS longitude,
      COUNT(*) AS count
    FROM "public"."complaints"
    WHERE "deletedAt" IS NULL
      AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL
    GROUP BY 1, 2
    ORDER BY count DESC
    LIMIT 25
  `;
  return rows.map((r) => ({ latitude: Number(r.latitude), longitude: Number(r.longitude), count: Number(r.count) }));
}

export type AnalyticsQuery = { days?: number };

export async function getFullAnalytics(query: AnalyticsQuery) {
  const days = Math.min(90, Math.max(1, Number(query.days) || 30));
  const [summary, categories, statuses, priorities, departments, trends, wards, hotZones] = await Promise.all([
    getSummary(),
    getByCategory(),
    getByStatus(),
    getByPriority(),
    getByDepartment(),
    getTrends(days),
    getTopWards(),
    getHotZones(),
  ]);
  return { summary, categories, statuses, priorities, departments, trends, wards, hotZones };
}