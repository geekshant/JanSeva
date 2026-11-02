import request from 'supertest';
import { createApp } from '../src/app';
import { resetDb, extractAccessToken } from './helpers';

const app = createApp();
const runId = Date.now().toString(36);

let citizenToken = '';
let adminToken = '';
let complaintId = '';
let trackingCode = '';

async function register(name: string, email: string) {
  const res = await request(app).post('/api/v1/auth/register').send({
    name,
    email,
    password: 'Password123',
    phone: `9000000${Math.floor(100 + Math.random() * 899)}`,
  });
  if (res.status !== 201) throw new Error(`register ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data as { id: string; email: string; role: string };
}

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Password123' });
  if (res.status !== 200) throw new Error(`login ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return extractAccessToken(res);
}

describe('auth', () => {
  beforeAll(async () => {
    await resetDb();
  });

  it('registers a new user', async () => {
    const user = await register('Test Citizen', `citizen-${runId}@test.local`);
    expect(user.email).toContain('@test.local');
    expect(user.role).toBe('CITIZEN');
  });

  it('rejects duplicate registrations', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Dup',
      email: `citizen-${runId}@test.local`,
      password: 'Password123',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('rejects a wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: `citizen-${runId}@test.local`,
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('complaints lifecycle', () => {
  beforeAll(async () => {
    await resetDb();

    const admin = await register('Operations Admin', `admin-${runId}@test.local`);
    const { prisma } = await import('../src/db/prisma');
    await prisma.user.update({ where: { id: admin.id }, data: { role: 'SYSTEM_ADMIN' } });
    adminToken = await login(admin.email);

    const citizen = await register('Citizen Reporter', `reporter-${runId}@test.local`);
    citizenToken = await login(citizen.email);
  });

  it('creates a complaint as a citizen', async () => {
    const res = await request(app)
      .post('/api/v1/complaints')
      .set({ Authorization: `Bearer ${citizenToken}` })
      .send({
        title: 'Pothole on campus road',
        description: 'Deep pothole blocking traffic.',
        category: 'POTHOLES',
        suggestedPriority: 'HIGH',
        latitude: 12.9,
        longitude: 77.6,
        address: 'Campus Road',
        imageUrls: [],
      })
      .expect(201);
    complaintId = res.body.data.complaint.id as string;
    trackingCode = res.body.data.complaint.trackingCode as string;
    expect(res.body.data.complaint.status).toBe('SUBMITTED');
  });

  it('exposes a public tracking lookup', async () => {
    const res = await request(app).get(`/api/v1/complaints/tracking/${trackingCode}`).expect(200);
    expect(res.body.data.title).toContain('Pothole');
  });

  it('advances the complaint to RESOLVED as admin', async () => {
    const advance = (toStatus: string, extra: Record<string, unknown> = {}) =>
      request(app)
        .patch(`/api/v1/complaints/${complaintId}/status`)
        .set({ Authorization: `Bearer ${adminToken}` })
        .send({ toStatus, ...extra });

    await advance('UNDER_REVIEW', { note: 'triage done' }).expect(200);
    await advance('IN_PROGRESS', { note: 'work started' }).expect(200);
    const resolved = await advance('RESOLVED', { resolutionNote: 'fixed' }).expect(200);
    expect(resolved.body.data.status).toBe('RESOLVED');
  });

  it('verifies a resolved complaint as the author', async () => {
    const res = await request(app)
      .post(`/api/v1/complaints/${complaintId}/verify`)
      .set({ Authorization: `Bearer ${citizenToken}` })
      .send({ result: 'VERIFIED', notes: 'all good' })
      .expect(200);
    expect(res.body.data.status).toBe('VERIFIED');
  });

  it('blocks citizens from changing status', async () => {
    await request(app)
      .patch(`/api/v1/complaints/${complaintId}/status`)
      .set({ Authorization: `Bearer ${citizenToken}` })
      .send({ toStatus: 'REOPENED' })
      .expect(403);
  });
});

describe('analytics', () => {
  beforeAll(async () => {
    await resetDb();
  });

  it('blocks analytics for citizens', async () => {
    const citizen = await register('Plain Citizen', `plain-${runId}@test.local`);
    const token = await login(citizen.email);
    await request(app).get('/api/v1/analytics/summary').set({ Authorization: `Bearer ${token}` }).expect(403);
  });

  it('serves analytics for admins', async () => {
    const admin = await register('Analytics Admin', `analytics-${runId}@test.local`);
    const { prisma } = await import('../src/db/prisma');
    await prisma.user.update({ where: { id: admin.id }, data: { role: 'SYSTEM_ADMIN' } });
    const token = await login(admin.email);
    const res = await request(app).get('/api/v1/analytics/summary').set({ Authorization: `Bearer ${token}` }).expect(200);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.sla.overdue).toBe('number');
    expect(typeof res.body.data.resolutionRate).toBe('number');
  });
});