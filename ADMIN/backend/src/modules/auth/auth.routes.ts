import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import * as controller from './auth.controller';
import {
  registerSchema,
  loginSchema,
  firebaseLoginSchema,
  refreshSchema,
  changePasswordSchema,
  updateProfileSchema,
} from './auth.schemas';

const router = Router();

// Stricter rate limit on credential endpoints to deter brute-force / credential
// stuffing (independent of the global API limiter).
router.post('/register', authLimiter, validate({ body: registerSchema }), controller.registerHandler);
router.post('/login', authLimiter, validate({ body: loginSchema }), controller.loginHandler);
router.post('/login/firebase', authLimiter, validate({ body: firebaseLoginSchema }), controller.firebaseLoginHandler);
router.post('/refresh', authLimiter, validate({ body: refreshSchema }), controller.refreshHandler);
router.post('/logout', controller.logoutHandler);

router.use(requireAuth);
router.get('/me', controller.meHandler);
router.patch('/me', validate({ body: updateProfileSchema }), controller.updateProfileHandler);
router.post('/change-password', validate({ body: changePasswordSchema }), controller.changePasswordHandler);

export default router;