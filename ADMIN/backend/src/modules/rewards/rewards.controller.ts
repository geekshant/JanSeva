import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './rewards.service';

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  const rewards = await service.getMyRewards(req.user!.userId);
  res.json(ApiResponse.ok(rewards, 'My rewards'));
});

export const leaderboardHandler = asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? 50);
  const leaderboard = await service.getLeaderboard(limit);
  res.json(ApiResponse.ok(leaderboard, 'Leaderboard'));
});

export const badgesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const badges = await service.listBadges();
  res.json(ApiResponse.ok(badges, 'Badges'));
});

export const transactionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listTransactions(req.user!.userId, req.query as never);
  res.json(ApiResponse.paginated(result.items, result.meta, 'Transactions'));
});