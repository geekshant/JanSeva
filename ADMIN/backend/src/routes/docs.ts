import { Router } from 'express';
import { EVENTS } from '../modules/realtime/events';

const router = Router();

const endpoints = {
  auth: {
    'POST /register': 'Create a citizen account',
    'POST /login': 'Exchange credentials for JWT + refresh token',
    'POST /refresh': 'Rotate the refresh token',
    'POST /logout': 'Revoke the current refresh session',
    'GET /me': 'Current user profile (auth)',
    'PATCH /password': 'Change password',
    'PATCH /profile': 'Update profile fields',
  },
  users: {
    'GET /': 'List users (admin, paginated)',
    'GET /:id': 'Get a user (admin)',
    'POST /': 'Create a user (admin)',
    'PATCH /:id': 'Update a user including role (admin)',
    'DELETE /:id': 'Soft delete a user (admin)',
  },
  departments: {
    'GET /': 'List departments (auth)',
    'POST /': 'Create department (admin)',
    'GET /:id': 'Get a department (auth)',
    'PATCH /:id': 'Update department (admin)',
  },
  complaints: {
    'GET /tracking/:code': 'Public tracking lookup by code',
    'GET /nearby': 'Geospatial radius search (PostGIS)',
    'GET /map': 'Complaints inside a viewport bounding box',
    'GET /clusters': 'Grid-clustered complaints for heatmaps',
    'GET /': 'List complaints with filters + sort=nearest (auth)',
    'GET /me': 'Complaints created by the caller',
    'GET /sla-breaches': 'Active complaints past their SLA deadline (admin)',
    'POST /': 'Submit a new complaint',
    'GET /:id': 'Full complaint detail (auth)',
    'PATCH /:id': 'Update a complaint (official)',
    'PATCH /:id/status': 'Transition lifecycle status (official)',
    'PATCH /:id/assign': 'Assign to department/officer (official)',
    'GET /:id/comments': 'List comments respecting visibility',
    'POST /:id/comments': 'Add a comment',
    'POST /:id/verify': 'Approve or reject a resolved complaint (author/admin)',
    'POST /:id/reopen': 'Reopen a resolved complaint (author/admin)',
    'POST /:id/images': 'Attach image URLs to a complaint',
  },
  notifications: {
    'GET /': 'List my notifications (paginated)',
    'PATCH /read-all': 'Mark everything read',
    'PATCH /:id/read': 'Mark one notification read',
    'POST /devices': 'Register an FCM device token',
    'DELETE /devices/:token': 'Unregister an FCM device token',
  },
  rewards: {
    'GET /me': 'My points, badges and recent transactions',
    'GET /leaderboard': 'Top citizens by points',
    'GET /transactions': 'My points history (paginated)',
    'GET /badges': 'Badge catalog',
  },
  analytics: {
    'GET /summary': 'Aggregate counts + SLA overview (admin)',
    'GET /categories': 'Complaints per category (admin)',
    'GET /statuses': 'Complaints per status (admin)',
    'GET /priorities': 'Complaints per priority (admin)',
    'GET /departments': 'Complaints per department (admin)',
    'GET /trends': 'Daily submitted/resolved series (admin)',
    'GET /hot-zones': 'Hotspot coordinates (admin)',
    'GET /': 'Full analytics bundle (admin)',
  },
  uploads: {
    'GET /presign': 'Cloudinary signed upload fields',
    'POST /confirm': 'Attach an uploaded asset to a complaint',
  },
};

router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'JanMitra API',
      version: '1.0.0',
      basePath: '/api/v1',
      envelope: {
        response: { success: true, data: '...', message: '...' },
        pagination: {
          items: '[]',
          meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        },
      },
      auth: 'Bearer <accessToken>',
      realtime: {
        path: '/socket.io',
        handshake: { auth: { token: '<accessToken>' } },
        // Derived from EVENTS so this list cannot drift from the emitter.
        events: ['connected', ...Object.values(EVENTS)],
      },
      endpoints,
    },
  });
});

export default router;