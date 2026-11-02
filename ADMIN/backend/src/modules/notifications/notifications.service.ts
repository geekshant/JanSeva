import { Prisma } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import { buildMeta } from '../../utils/pagination';
import { prisma } from '../../db/prisma';
import { getBroadcaster, EVENTS } from '../realtime';
import { NotificationType } from '../../constants';

export interface SendNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
  complaintId?: string;
}

/** Persist a notification for a user and push it over the realtime socket. */
export async function sendNotification(input: SendNotificationInput): Promise<void> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      payload: (input.payload as Prisma.InputJsonValue) ?? undefined,
      complaintId: input.complaintId,
    },
  });

  getBroadcaster().toUser(input.userId, EVENTS.notification, {
    notification: {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      payload: notification.payload,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    },
  });

  // Best-effort FCM push. Runs only here on the trusted backend (firebase-admin
  // credentials never leave the server). Never fails the in-app notification
  // if FCM is unavailable or not configured.
  void pushToUser(input.userId, {
    title: input.title,
    body: input.body,
    data: {
      ...(input.payload ?? {}),
      notification_id: notification.id,
      notification_type: input.type,
      ...(input.complaintId ? { complaint_id: input.complaintId } : {}),
    },
  });
}

export async function sendNotificationsToMany(
  inputs: SendNotificationInput[],
): Promise<void> {
  for (const input of inputs) {
    await sendNotification(input);
  }
}

export async function listNotifications(
  userId: string,
  query: { page: number; limit: number; unreadOnly?: string },
) {
  const where = {
    userId,
    ...(query.unreadOnly === 'true' ? { readAt: null } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return { items, meta: buildMeta(total, query.page, query.limit) };
}

export async function markNotificationRead(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) throw ApiError.notFound('Notification not found');

  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function registerDeviceToken(
  userId: string,
  token: string,
  platform: string | undefined,
) {
  const existing = await prisma.deviceToken.findUnique({ where: { token } });
  if (existing) {
    await prisma.deviceToken.update({
      where: { token },
      data: { userId, platform: platform ?? null, lastUsedAt: new Date() },
    });
    return existing;
  }
  return prisma.deviceToken.create({
    data: { userId, token, platform: platform ?? null },
  });
}

export async function unregisterDeviceToken(userId: string, token: string) {
  await prisma.deviceToken.deleteMany({ where: { token, userId } });
}

/** Fire an FCM push message to a user's registered devices (when configured). */
export async function pushToUser(
  userId: string,
  notification: { title: string; body?: string; data?: Record<string, unknown> },
): Promise<number> {
  const tokens = await prisma.deviceToken.findMany({
    where: { userId },
    select: { token: true },
  });
  if (tokens.length === 0) return 0;

  let messaging;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require('firebase-admin');
    if (admin.apps?.length === 0) return 0;
    messaging = admin.messaging();
  } catch {
    return 0; // firebase-admin not initialised — skip push
  }

  const messages = tokens.map(({ token }) => ({
    token,
    notification: { title: notification.title, body: notification.body },
    data: notification.data ? mapToFcmData(notification.data) : undefined,
  }));

  try {
    const results = await Promise.allSettled(messages.map((m) => messaging.send(m)));
    return results.filter((r) => r.status === 'fulfilled').length;
  } catch {
    return 0;
  }
}

function mapToFcmData(record: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      .map(([key, value]) => [key, String(value)]),
  );
}