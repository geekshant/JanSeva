import { PrismaClient, UserRole, ComplaintStatus, ComplaintPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CATEGORY_SLA_HOURS } from '../src/constants/sla';
import { computeSlaDeadline } from '../src/utils/sla';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123';

const DEPARTMENTS = [
  {
    name: 'Roads & Infrastructure',
    code: 'ROADS',
    categoryMapping: ['POTHOLES', 'ROAD_DAMAGE'],
    description: 'Maintenance and repair of roads, footpaths and signage',
  },
  {
    name: 'Sanitation & Waste',
    code: 'SANITATION',
    categoryMapping: ['GARBAGE', 'SEWAGE', 'DRAINAGE'],
    description: 'Garbage collection, sewage and drainage upkeep',
  },
  {
    name: 'Public Utilities',
    code: 'UTILITIES',
    categoryMapping: ['WATER_LEAKAGE', 'STREETLIGHT', 'ELECTRICITY'],
    description: 'Water, street lighting and electricity faults',
  },
  {
    name: 'Parks & Public Spaces',
    code: 'PARKS',
    categoryMapping: ['PARK_MAINTENANCE'],
    description: 'Maintenance of parks, playgrounds and civic spaces',
  },
  {
    name: 'Public Safety',
    code: 'SAFETY',
    categoryMapping: ['SAFETY_HAZARD'],
    description: 'Hazards affecting public safety',
  },
] as const;

async function upsertDepartment(
  name: string,
  code: string,
  categoryMapping: readonly string[],
  description: string,
) {
  return prisma.department.upsert({
    where: { code },
    update: { name, categoryMapping: [...categoryMapping], description },
    create: { name, code, categoryMapping: [...categoryMapping], description },
  });
}

async function upsertUser(
  name: string,
  email: string,
  role: UserRole,
  departmentId?: string,
) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, departmentId: departmentId ?? null },
    create: {
      name,
      email,
      role,
      departmentId,
      passwordHash,
      isActive: true,
    },
  });
}

async function main() {
  console.log('Seeding departments...');
  const roads = await upsertDepartment(...Object.values(DEPARTMENTS[0]));
  const sanitation = await upsertDepartment(...Object.values(DEPARTMENTS[1]));
  const utilities = await upsertDepartment(...Object.values(DEPARTMENTS[2]));
  const parks = await upsertDepartment(...Object.values(DEPARTMENTS[3]));
  const safety = await upsertDepartment(...Object.values(DEPARTMENTS[4]));

  console.log('Seeding users...');
  const admin = await upsertUser('System Administrator', 'admin@janmitra.local', UserRole.SYSTEM_ADMIN);
  await upsertUser('Roads Department Admin', 'roads.admin@janmitra.local', UserRole.DEPARTMENT_ADMIN, roads.id);
  await upsertUser('Sanitation Department Admin', 'sanitation.admin@janmitra.local', UserRole.DEPARTMENT_ADMIN, sanitation.id);
  await upsertUser('Roads Field Officer', 'roads.officer@janmitra.local', UserRole.OFFICIAL, roads.id);
  await upsertUser('Utilities Field Officer', 'utilities.officer@janmitra.local', UserRole.OFFICIAL, utilities.id);

  const citizenA = await upsertUser('Priya Sharma', 'citizen.demo@janmitra.local', UserRole.CITIZEN);
  const citizenB = await upsertUser('Rahul Verma', 'citizen.demo2@janmitra.local', UserRole.CITIZEN);

  console.log('Seeding badges...');
  const badges = [
    { name: 'FIRST_REPORT', slug: 'first-report', pointsThreshold: 10, description: 'Submitted your first complaint' },
    { name: 'CIVIC_STARTER', slug: 'civic-starter', pointsThreshold: 50, description: 'Submitted 5 complaints' },
    { name: 'NEIGHBORHOOD_HELPER', slug: 'neighborhood-helper', pointsThreshold: 100, description: 'Helped resolve issues around your area' },
    { name: 'VERIFIED_CONTRIBUTOR', slug: 'verified-contributor', pointsThreshold: 150, description: 'Had a complaint verified resolved' },
    { name: 'CLEAN_STREETS_CHAMPION', slug: 'clean-streets-champion', pointsThreshold: 200, description: 'Contributed to clean street reports' },
    { name: 'COMMUNITY_WATCHER', slug: 'community-watcher', pointsThreshold: 300, description: 'Active community participant' },
    { name: 'CONSISTENT_CITIZEN', slug: 'consistent-citizen', pointsThreshold: 500, description: 'Consistent reporting over 30 days' },
  ] as const;
  const badgeRows: Record<string, string> = {};
  for (const b of badges) {
    const row = await prisma.badge.upsert({
      where: { name: b.name },
      update: { description: b.description, pointsThreshold: b.pointsThreshold },
      create: {
        name: b.name,
        slug: b.slug,
        description: b.description,
        pointsThreshold: b.pointsThreshold,
      },
    });
    badgeRows[b.name] = row.id;
  }

  console.log('Seeding sample complaints with locations...');
  const sampleComplaints = [
    {
      title: 'Deep pothole near vegetable market',
      description: 'Large pothole forming on MG Road near the vegetable market, dangerous after dark.',
      category: 'POTHOLES',
      priority: ComplaintPriority.HIGH,
      latitude: 12.9716,
      longitude: 77.5946,
      address: 'MG Road, Bengaluru',
      status: ComplaintStatus.VERIFIED,
      points: 10,
      user: citizenA,
      department: roads,
    },
    {
      title: 'Garbage not collected for a week',
      description: 'Garbage is piling up near the bus stop, causing a severe smell and flies.',
      category: 'GARBAGE',
      priority: ComplaintPriority.MEDIUM,
      latitude: 12.975,
      longitude: 77.61,
      address: 'Indiranagar Bus Stop',
      status: ComplaintStatus.IN_PROGRESS,
      points: 10,
      user: citizenB,
      department: sanitation,
    },
    {
      title: 'Streetlight flickering at night',
      description: 'Streetlight pole every alternate night, dark stretch on the park lane.',
      category: 'STREETLIGHT',
      priority: ComplaintPriority.LOW,
      latitude: 12.982,
      longitude: 77.6005,
      address: 'Park Lane, Jayanagar',
      status: ComplaintStatus.ASSIGNED,
      points: 0,
      user: citizenA,
      department: utilities,
    },
    {
      title: 'Broken park bench and swing',
      description: 'Bench broken and the kids swing has a snapped chain.',
      category: 'PARK_MAINTENANCE',
      priority: ComplaintPriority.LOW,
      latitude: 12.958,
      longitude: 77.581,
      address: 'Cubbon Park Corner',
      status: ComplaintStatus.REJECTED,
      points: 0,
      user: citizenB,
      department: parks,
    },
    {
      title: 'Open manhole cover near school',
      description: 'Manhole cover missing right outside the school gate.',
      category: 'SAFETY_HAZARD',
      priority: ComplaintPriority.CRITICAL,
      latitude: 12.9655,
      longitude: 77.6113,
      address: 'St. Marys School Road',
      status: ComplaintStatus.RESOLVED,
      points: 10,
      user: citizenA,
      department: safety,
    },
    {
      title: 'Water leakage on the main road',
      description: 'Continuous water leakage from the pipe joint, road getting damaged.',
      category: 'WATER_LEAKAGE',
      priority: ComplaintPriority.HIGH,
      latitude: 12.928,
      longitude: 77.585,
      address: 'Double Road, Shanti Nagar',
      status: ComplaintStatus.IN_PROGRESS,
      points: 10,
      user: citizenB,
      department: utilities,
    },
  ] as const;

  const citizenAIds: string[] = [];
  for (const s of sampleComplaints) {
    const trackingCode = `JM-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const existing = await prisma.complaint.findFirst({
      where: { title: s.title },
      select: { id: true },
    });
    if (existing) continue;

    const complaint = await prisma.complaint.create({
      data: {
        trackingCode,
        title: s.title,
        description: s.description,
        category: s.category,
        status: s.status,
        priority: s.priority,
        latitude: s.latitude,
        longitude: s.longitude,
        address: s.address,
        resolvedAt: s.status === ComplaintStatus.RESOLVED ? new Date('2026-09-20') : null,
        slaDueAt: computeSlaDeadline(CATEGORY_SLA_HOURS[s.category as keyof typeof CATEGORY_SLA_HOURS] ?? 72).slaDueAt,
        createdById: s.user.id,
        assignedDepartmentId: s.department.id,
      },
    });
    if (s.user.id === citizenA.id) citizenAIds.push(complaint.id);

    if (s.points > 0) {
      await prisma.user.update({
        where: { id: s.user.id },
        data: { points: { increment: s.points } },
      });
      await prisma.pointsTransaction.create({
        data: {
          userId: s.user.id,
          points: s.points,
          type: 'EARN',
          reason: `${s.points} points for reporting "${s.title}"`,
        },
      });
    }

    if (s.status === ComplaintStatus.IN_PROGRESS || s.status === ComplaintStatus.ASSIGNED || s.status === ComplaintStatus.RESOLVED) {
      await prisma.complaintAssignment.create({
        data: {
          complaintId: complaint.id,
          departmentId: s.department.id,
          officerId: s.department.code === 'ROADS' || s.department.code === 'UTILITIES' ? s.user.id : null,
          assignedById: admin.id,
        },
      });
    }

    await prisma.complaintStatusHistory.create({
      data: {
        complaintId: complaint.id,
        fromStatus: null,
        toStatus: s.status,
        changedById: s.user.id,
      },
    });
  }

  const citizenAWithBadge = await prisma.userBadge.findFirst({
    where: { userId: citizenA.id },
  });
  if (!citizenAWithBadge) {
    await prisma.userBadge.create({
      data: {
        userId: citizenA.id,
        badgeId: badgeRows.FIRST_REPORT,
      },
    });
  }
  const citizenBWithBadge = await prisma.userBadge.findFirst({
    where: { userId: citizenB.id },
  });
  if (!citizenBWithBadge) {
    await prisma.userBadge.create({
      data: {
        userId: citizenB.id,
        badgeId: badgeRows.CIVIC_STARTER,
      },
    });
  }

  console.log('Seed complete.');
  console.log('Demo users (password: Password123):');
  console.log('  admin@janmitra.local  -> SYSTEM_ADMIN');
  console.log('  roads.admin@janmitra.local | sanitation.admin@janmitra.local -> DEPARTMENT_ADMIN');
  console.log('  roads.officer@janmitra.local | utilities.officer@janmitra.local -> OFFICIAL');
  console.log('  citizen.demo@janmitra.local | citizen.demo2@janmitra.local -> CITIZEN');
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });