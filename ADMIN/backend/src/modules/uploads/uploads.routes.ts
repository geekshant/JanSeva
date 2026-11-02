import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import * as controller from './uploads.controller';
import { presignQuerySchema, confirmSchema } from './uploads.schemas';

const router = Router();

router.use(requireAuth);

router.get('/presign', validate({ query: presignQuerySchema }), controller.presignHandler);
router.post('/confirm', validate({ body: confirmSchema }), controller.confirmHandler);

export default router;