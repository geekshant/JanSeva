import request from 'supertest';
import { createApp } from '../src/app';
import { resetDb, extractAccessToken } from './helpers';

const app = createApp();
const runId = Date.now().toString(36);

let adminToken = '';
let citizenToken = '';
let citizenId = '';

async function register(name: string, email: string) {
  const res = await request(app).post('/api/v1/auth/register').send({
    name,
    email,
    password: 'Password123',
  });
  if (res.status !== 201) throw new Error(`register ${email}: ${res.status}`);
  return res.body.data as { id: string; role: string };
}

beforeAll(async () => {
  await resetDb();
  const admin = await register('Mgmt Admin', `mgmt-admin-${runId}@test.local`);
  const { prisma } = await import('../src/db/prisma');
  await prisma.user.update({ where: { id: admin.id }, data: { role: 'SYSTEM_ADMIN' } });
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `mgmt-admin-${runId}@test.local`, password: 'Password123' });
  adminToken = extractAccessToken(loginRes);

  const citizen = await register('Mgmt Citizen', `mgmt-citizen-${runId}@test.local`);
  citizenId = citizen.id;
  const citizenLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `mgmt-citizen-${runId}@test.local`, password: 'Password123' });
  citizenToken = extractAccessToken(citizenLogin);
});

describe('departments', () => {
  it('creates and lists departments', async () => {
    const created = await request(app)
      .post('/api/v1/departments')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ name: 'Test Sanitation', code: 'TSTSAN', categoryMapping: ['GARBAGE'], description: 'For tests' })
      .expect(201);
    expect(created.body.data.code).toBe('TSTSAN');

    const list = await request(app)
      .get('/api/v1/departments')
      .set({ Authorization: `Bearer ${citizenToken}` })
      .expect(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects duplicate department codes', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ name: 'Dup Sanitation', code: 'TSTSAN' })
      .expect(409);
    expect(res.body.error.code).toBe('DEPT_CODE_EXISTS');
  });
});

describe('users (admin)', () => {
  it('lists users and filters by role', async () => {
    const list = await request(app)
      .get('/api/v1/users?role=SYSTEM_ADMIN')
      .set({ Authorization: `Bearer ${adminToken}` })
      .expect(200);
    expect(list.body.data.some((u: { role: string }) => u.role === 'SYSTEM_ADMIN')).toBe(true);
  });

  it('updates a user role as admin', async () => {
    const updated = await request(app)
      .patch(`/api/v1/users/${citizenId}`)
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ role: 'OFFICIAL' })
      .expect(200);
    expect(updated.body.data.role).toBe('OFFICIAL');
  });

  it('blocks citizen from admin endpoints', async () => {
    await request(app).get('/api/v1/users').set({ Authorization: `Bearer ${citizenToken}` }).expect(403);
  });
});

describe('rewards', () => {
  it('has a seeded badge catalog', async () => {
    const { prisma } = await import('../src/db/prisma');
    const badgeCount = await prisma.badge.count();
    if (badgeCount === 0) {
      const rules = [
        ['first_report', 10], ['civic_starter', 25], ['neighborhood_helper', 50],
        ['verified_contributor', 75], ['clean_streets_champion', 150],
        ['community_watcher', 200], ['consistent_citizen', 300],
      ] as const;
      for (const [slug, pointsThreshold] of rules) {
        await prisma.badge.create({ data: { slug, name: slug, description: 'Test badge', pointsThreshold } });
      }
    }
    const res = await request(app).get('/api/v1/rewards/badges').set({ Authorization: `Bearer ${adminToken}` }).expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(7);
  });

  it('awards points for a verified resolution', async () => {
    // Register + verify the whole micro-cycle with rewards assertions.
    await register('Point Earner', `pointearner-${runId}@test.local`);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `pointearner-${runId}@test.local`, password: 'Password123' });
    const reporterToken = extractAccessToken(login);

    const created = await request(app)
      .post('/api/v1/complaints')
      .set({ Authorization: `Bearer ${reporterToken}` })
      .send({
        title: 'Reward driven pothole',
        description: 'Will net points on verification.',
        category: 'POTHOLES',
        latitude: 12.9,
        longitude: 77.6,
        address: 'Reward Road',
        imageUrls: [],
      })
      .expect(201);
    const id = created.body.data.complaint.id as string;

    const { prisma } = await import('../src/db/prisma');
    await prisma.complaint.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date() } });

    const verified = await request(app)
      .post(`/api/v1/complaints/${id}/verify`)
      .set({ Authorization: `Bearer ${reporterToken}` })
      .send({ result: 'VERIFIED', notes: 'done' })
      .expect(200);
    expect(verified.body.data.status).toBe('VERIFIED');

    const me = await request(app).get('/api/v1/rewards/me').set({ Authorization: `Bearer ${reporterToken}` }).expect(200);
    expect(me.body.data.user.points).toBeGreaterThanOrEqual(10);
    expect(me.body.data.badges.length).toBeGreaterThanOrEqual(1);
  });
});

describe('notifications', () => {
  it('registers and lists a device token', async () => {
    const reg = await request(app)
      .post('/api/v1/notifications/devices')
      .set({ Authorization: `Bearer ${citizenToken}` })
      .send({ token: `fcm-${runId}-${crypto.randomUUID()}`, platform: 'android' })
      .expect(201);
    expect(reg.body.data.token).toContain('fcm-');

    const res = await request(app)
      .get('/api/v1/notifications')
      .set({ Authorization: `Bearer ${citizenToken}` })
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('produces a notification on status changes', async () => {
    await register('Notif Watcher', `notifwatcher-${runId}@test.local`);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `notifwatcher-${runId}@test.local`, password: 'Password123' });
    const token = extractAccessToken(login);

    const created = await request(app)
      .post('/api/v1/complaints')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        title: 'Notification test',
        description: 'Should create a notification.',
        category: 'GARBAGE',
        latitude: 12.9,
        longitude: 77.6,
        address: 'N Road',
        imageUrls: [],
      })
      .expect(201);
    const id = created.body.data.complaint.id as string;

    await request(app)
      .patch(`/api/v1/complaints/${id}/status`)
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ toStatus: 'UNDER_REVIEW', note: 'acknowledged' })
      .expect(200);
    await request(app)
      .patch(`/api/v1/complaints/${id}/status`)
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ toStatus: 'IN_PROGRESS', note: 'working on it' })
      .expect(200);

    const notifs = await request(app)
      .get('/api/v1/notifications?unreadOnly=true')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(notifs.body.data.some((n: { title: string }) => n.title.includes('IN PROGRESS'))).toBe(true);
  });
});