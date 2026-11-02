import request from 'supertest';
import { createApp } from '../src/app';
import { resetDb, extractAccessToken } from './helpers';

const app = createApp();
const runId = Date.now().toString(36);

let token = '';
let adminToken = '';
let complaintId = '';
let trackingCode = '';

async function register(name: string, email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email, password: 'Password123' });
  if (res.status !== 201) throw new Error(`register ${email}: ${res.status}`);
  return res.body.data as { id: string };
}

async function createComplaint(auth: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/v1/complaints')
    .set({ Authorization: `Bearer ${auth}` })
    .send({
      title: 'Spatial pothole',
      description: 'A sufficiently long spatial description for validation.',
      category: 'POTHOLES',
      latitude: 12.9701,
      longitude: 77.5944,
      address: 'Spatial Road',
      imageUrls: [],
      ...overrides,
    })
    .expect(201);
  return res.body.data.complaint;
}

beforeAll(async () => {
  await resetDb();
  await register('Spatial Citizen', `spatial-citizen-${runId}@test.local`);
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `spatial-citizen-${runId}@test.local`, password: 'Password123' });
  token = extractAccessToken(login);

  const complaint = await createComplaint(token, { title: 'Spatial near center', description: 'At central zone for geospatial assertions.', address: 'MG Road', latitude: 12.9701, longitude: 77.5944 });
  complaintId = complaint.id;
  trackingCode = complaint.trackingCode;

  await createComplaint(token, { title: 'Spatial far away', description: 'Ten kilometres north for the radius exclusion case.', address: 'North End', latitude: 13.06, longitude: 77.5944 });
  await createComplaint(token, { title: 'Spatial west edge', description: 'Just inside the bounding box for the map query.', address: 'West Park', latitude: 12.97, longitude: 77.58 });

  const { prisma } = await import('../src/db/prisma');
  const admin = await register('Spatial Admin', `spatial-admin-${runId}@test.local`);
  await prisma.user.update({ where: { id: admin.id }, data: { role: 'SYSTEM_ADMIN' } });
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `spatial-admin-${runId}@test.local`, password: 'Password123' });
  adminToken = extractAccessToken(adminLogin);
});

describe('geospatial complaints', () => {
  it('finds complaints within a radius and orders by distance', async () => {
    const res = await request(app)
      .get('/api/v1/complaints/nearby')
      .query({ latitude: 12.97, longitude: 77.59, radiusKm: 2, limit: 10 })
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    const items = res.body.data as { id: string; distanceMeters?: number }[];
    expect(items.length).toBeGreaterThanOrEqual(2);
    const center = items.find((i) => i.id === complaintId);
    expect(center).toBeDefined();
    expect(center!.distanceMeters).toBeLessThan(2000);
  });

  it('excludes complaints outside the radius', async () => {
    const res = await request(app)
      .get('/api/v1/complaints/nearby')
      .query({ latitude: 12.97, longitude: 77.59, radiusKm: 1.5, limit: 10 })
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    const titles = (res.body.data as { title: string }[]).map((i) => i.title);
    expect(titles.some((t) => t === 'Spatial far away')).toBe(false);
  });

  it('returns map bounds results with status filter', async () => {
    const res = await request(app)
      .get('/api/v1/complaints/map')
      .query({ neLat: 13.05, swLat: 12.9, neLng: 77.7, swLng: 77.5, status: 'SUBMITTED' })
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    const items = res.body.data as { id: string }[];
    expect(items.map((i) => i.id)).toContain(complaintId);
  });

  it('clusters complaints into grid heavy-points', async () => {
    const res = await request(app)
      .get('/api/v1/complaints/clusters')
      .query({ neLat: 13.05, swLat: 12.9, neLng: 77.7, swLng: 77.5, zoom: 12, gridSize: 0.05 })
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    const rows = res.body.data as { cell: string; count: number; centerLat: number; centerLng: number }[];
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(typeof rows[0].count).toBe('number');
    expect(rows[0].centerLat).toBeGreaterThan(0);
  });

  it('tracks a complaint publicly by tracking code', async () => {
    const res = await request(app)
      .get(`/api/v1/complaints/tracking/${trackingCode}`)
      .expect(200);
    expect(res.body.data.id).toBe(complaintId);
  });

  it('surfaces a manual SLA breach to admins', async () => {
    const { prisma } = await import('../src/db/prisma');
    await prisma.complaint.update({
      where: { id: complaintId },
      data: { slaDueAt: new Date(Date.now() - 3600_000), statusChangedAt: new Date() },
    });
    const res = await request(app)
      .get('/api/v1/complaints/sla-breaches?page=1&limit=10')
      .set({ Authorization: `Bearer ${adminToken}` })
      .expect(200);
    const items = res.body.data as { id: string }[];
    expect(items.map((i) => i.id)).toContain(complaintId);
  });
});