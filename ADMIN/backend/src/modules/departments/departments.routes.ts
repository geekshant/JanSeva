import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin, requireOfficial } from '../../middleware/auth';
import * as controller from './departments.controller';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  listDepartmentsQuerySchema,
  listDepartmentComplaintsQuerySchema,
} from './departments.schemas';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listDepartmentsQuerySchema }), controller.listDepartmentsHandler);
router.get('/overview', requireOfficial, controller.departmentOverviewHandler);
router.get('/:id', controller.getDepartmentHandler);
router.get('/:id/complaints', validate({ query: listDepartmentComplaintsQuerySchema }), controller.departmentComplaintsHandler);

router.post('/', requireAdmin, validate({ body: createDepartmentSchema }), controller.createDepartmentHandler);
router.patch('/:id', requireAdmin, validate({ body: updateDepartmentSchema }), controller.updateDepartmentHandler);
router.delete('/:id', requireAdmin, controller.deleteDepartmentHandler);

export default router;