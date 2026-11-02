import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import * as controller from './notifications.controller';
import { listNotificationsQuerySchema, markReadParamsSchema, registerDeviceTokenSchema, deviceTokenParamsSchema } from './notifications.schemas';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listNotificationsQuerySchema }), controller.listNotificationsHandler);
router.patch('/read-all', controller.markAllReadHandler);
router.patch('/:id/read', validate({ params: markReadParamsSchema }), controller.markReadHandler);

router.post('/devices', validate({ body: registerDeviceTokenSchema }), controller.registerDeviceTokenHandler);
router.delete('/devices/:token', validate({ params: deviceTokenParamsSchema }), controller.unregisterDeviceTokenHandler);

export default router;