import { Router, Request, Response } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import departmentsRoutes from '../modules/departments/departments.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import rewardsRoutes from '../modules/rewards/rewards.routes';
import complaintsRoutes from '../modules/complaints/complaints.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import uploadsRoutes from '../modules/uploads/uploads.routes';
import docsRoutes from './docs';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: 'JanMitra API',
      version: '1.0.0',
      docs: '/api/v1/docs',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/departments', departmentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/rewards', rewardsRoutes);
router.use('/complaints', complaintsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/uploads', uploadsRoutes);
router.use('/docs', docsRoutes);

export default router;