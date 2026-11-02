import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import * as controller from './rewards.controller';
import { listTransactionsQuerySchema, leaderboardQuerySchema } from './rewards.schemas';

const router = Router();

router.use(requireAuth);

router.get('/me', controller.meHandler);
router.get('/leaderboard', validate({ query: leaderboardQuerySchema }), controller.leaderboardHandler);
router.get('/transactions', validate({ query: listTransactionsQuerySchema }), controller.transactionsHandler);
router.get('/badges', controller.badgesHandler);

export default router;