import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import * as controller from './analytics.controller';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/summary', controller.summaryHandler);
router.get('/categories', controller.categoriesHandler);
router.get('/statuses', controller.statusesHandler);
router.get('/priorities', controller.prioritiesHandler);
router.get('/departments', controller.departmentsHandler);
router.get('/trends', controller.trendsHandler);
router.get('/hot-zones', controller.hotZonesHandler);
router.get('/', controller.fullHandler);

export default router;