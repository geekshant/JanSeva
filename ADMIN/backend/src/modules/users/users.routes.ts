import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import * as controller from './users.controller';
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from './users.schemas';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', validate({ query: listUsersQuerySchema }), controller.listUsersHandler);
router.get('/:id', controller.getUserHandler);
router.post('/', validate({ body: createUserSchema }), controller.createUserHandler);
router.patch('/:id', validate({ body: updateUserSchema }), controller.updateUserHandler);
router.delete('/:id', controller.deleteUserHandler);

export default router;