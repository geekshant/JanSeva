import { prisma } from '../../db/prisma';
import { ApiError } from '../../utils/ApiError';
import { buildMeta } from '../../utils/pagination';
import { POINT_RULES, BADGE_RULES, PointsRuleKey, BadgeRuleKey } from '../../utils/points';
import { sendNotification } from '../notifications/notifications.service';
import { getBroadcaster, EVENTS } from '../realtime';

export interface AwardPointsInput {
  userId: string;
  rule: PointsRuleKey;
  referenceId?: string;
  complaintId?: string;
}

const BADGE_ORDER: BadgeRuleKey[] = [
  'FIRST_REPORT',
  'CIVIC_STARTER',
  'NEIGHBORHOOD_HELPER',
  'VERIFIED_CONTRIBUTOR',
  'CLEAN_STREETS_CHAMPION',
  'COMMUNITY_WATCHER',
  'CONSISTENT_CITIZEN',
];

/**
 * Award points for an action, update the running total, then unlock any badges
 * the new total qualifies for. Emits realtime + in-app notifications.
 */
export async function awardPoints(input: AwardPointsInput): Promise<void> {
  const rule = POINT_RULES[input.rule];

  await prisma.$transaction(async (tx) => {
    // Guard against double-awarding the same reference.
    if (input.referenceId) {
      const existing = await tx.pointsTransaction.findFirst({
        where: { referenceId: input.referenceId },
      });
      if (existing) return;
    }

    await tx.pointsTransaction.create({
      data: {
        userId: input.userId,
        points: rule.points,
        type: rule.points >= 0 ? 'EARN' : 'PENALTY',
        reason: rule.reason,
        referenceId: input.referenceId,
        complaintId: input.complaintId,
      },
    });

    const current = await tx.user.findUnique({ where: { id: input.userId } });
    if (!current) return;

    const newPoints = current.points + rule.points;
    await tx.user.update({ where: { id: input.userId }, data: { points: newPoints } });

    // Badge unlock evaluation.
    for (const key of BADGE_ORDER) {
      const badgeRule = BADGE_RULES[key];
      if (newPoints < badgeRule.pointsThreshold) continue;

      const badge = await tx.badge.findUnique({ where: { slug: key.toLowerCase() } });
      if (!badge) continue;

      const exists = await tx.userBadge.findUnique({
        where: { userId_badgeId: { userId: input.userId, badgeId: badge.id } },
      });
      if (exists) continue;

      await tx.userBadge.create({ data: { userId: input.userId, badgeId: badge.id } });
      await sendNotification({
        userId: input.userId,
        type: 'BADGE_UNLOCKED',
        title: `Badge unlocked: ${badge.name}`,
        body: badge.description ?? undefined,
        payload: { badge: badge.slug },
      });
      getBroadcaster().toUser(input.userId, EVENTS.notification, {
        event: 'BADGE_UNLOCKED',
        badge: badge.slug,
        points: newPoints,
      });
    }
  });

  getBroadcaster().toUser(input.userId, EVENTS.notification, {
    event: 'REWARD_EARNED',
    rule: input.rule,
    points: rule.points,
  });
}

export async function getMyRewards(userId: string) {
  const [user, transactions, userBadges] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, points: true },
    }),
    prisma.pointsTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    }),
  ]);
  if (!user) throw ApiError.notFound('User not found');
  return { user, transactions, badges: userBadges.map((ub) => ub.badge) };
}

export async function getLeaderboard(limit = 50) {
  const leaders = await prisma.user.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      points: true,
      avatarUrl: true,
      _count: { select: { complaints: true } },
    },
    orderBy: [{ points: 'desc' }, { createdAt: 'asc' }],
    take: limit,
  });

  const ranked = leaders.map((user, index) => ({
    rank: index + 1,
    id: user.id,
    name: user.name,
    points: user.points,
    avatarUrl: user.avatarUrl,
    complaintsCount: user._count.complaints,
  }));

  return ranked;
}

export async function listBadges() {
  return prisma.badge.findMany({ orderBy: { pointsThreshold: 'asc' } });
}

export async function listTransactions(
  userId: string,
  query: { page: number; limit: number },
) {
  const where = { userId };
  const [total, items] = await Promise.all([
    prisma.pointsTransaction.count({ where }),
    prisma.pointsTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { items, meta: buildMeta(total, query.page, query.limit) };
}