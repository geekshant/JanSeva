import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin, requireOfficial } from '../../middleware/auth';
import * as controller from './complaints.controller';
import {
  createComplaintSchema,
  listComplaintsQuerySchema,
  updateComplaintSchema,
  changeStatusSchema,
  assignComplaintSchema,
  createCommentSchema,
  verifyComplaintSchema,
  reopenComplaintSchema,
  addImagesSchema,
  paramsSchema,
  nearbyQuerySchema,
  mapBoundsQuerySchema,
  trackingParamsSchema,
} from './complaints.schemas';

const router = Router();

router.get('/tracking/:code', validate({ params: trackingParamsSchema }), controller.getByTrackingCodeHandler);

// Geospatial endpoints (public map views).
router.get('/nearby', validate({ query: nearbyQuerySchema }), controller.nearbyHandler);
router.get('/map', validate({ query: mapBoundsQuerySchema }), controller.mapBoundsHandler);
router.get('/clusters', validate({ query: mapBoundsQuerySchema }), controller.clusterHandler);

router.use(requireAuth);

router.get('/', validate({ query: listComplaintsQuerySchema }), controller.listComplaintsHandler);
router.get('/me', validate({ query: listComplaintsQuerySchema }), controller.listMyComplaintsHandler);
// Cross-department view of every overdue complaint — admin-level only, as
// documented in routes/docs.ts.
router.get('/sla-breaches', requireAdmin, controller.slaBreachesHandler);

router.post('/', validate({ body: createComplaintSchema }), controller.createComplaintHandler);

router.get('/:id', validate({ params: paramsSchema }), controller.getComplaintHandler);
router.patch('/:id', requireOfficial, validate({ params: paramsSchema, body: updateComplaintSchema }), controller.updateComplaintHandler);
router.patch('/:id/status', requireOfficial, validate({ params: paramsSchema, body: changeStatusSchema }), controller.changeStatusHandler);
router.patch('/:id/assign', requireOfficial, validate({ params: paramsSchema, body: assignComplaintSchema }), controller.assignComplaintHandler);

router.get('/:id/comments', validate({ params: paramsSchema }), controller.listCommentsHandler);
router.post('/:id/comments', validate({ params: paramsSchema, body: createCommentSchema }), controller.addCommentHandler);

router.post('/:id/verify', validate({ params: paramsSchema, body: verifyComplaintSchema }), controller.verifyComplaintHandler);
router.post('/:id/reopen', validate({ params: paramsSchema, body: reopenComplaintSchema }), controller.reopenComplaintHandler);
router.post('/:id/images', validate({ params: paramsSchema, body: addImagesSchema }), controller.addImagesHandler);

export default router;