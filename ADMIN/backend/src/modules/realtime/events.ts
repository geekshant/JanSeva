import { Server as SocketServer } from 'socket.io';

/**
 * Server->client event names. The Flutter app and dashboard listen to these
 * to update complaint status and notification feeds in real time.
 */
export const EVENTS = {
  complaintCreated: 'complaint:created',
  complaintUpdated: 'complaint:updated',
  statusChanged: 'complaint:status-changed',
  commentAdded: 'complaint:comment-added',
  assigned: 'complaint:assigned',
  verified: 'complaint:verified',

  notification: 'notification:new',

  statsUpdated: 'dashboard:stats-updated',
} as const;

export type RealtimeEvent = (typeof EVENTS)[keyof typeof EVENTS];

export interface ComplaintEventPayload {
  complaintId: string;
  trackingCode?: string;
  status?: string;
  changedBy?: string;
  changedAt: string;
}

/**
 * Broadcaster used by services. Accepts an injected server so unit tests can
 * stub the transport easily.
 */
export class RealtimeBroadcaster {
  constructor(private readonly io: SocketServer | null) {}

  toUser(userId: string, event: RealtimeEvent, payload: unknown): void {
    this.io?.to(`user:${userId}`).emit(event, payload);
  }

  toDepartment(departmentId: string, event: RealtimeEvent, payload: unknown): void {
    this.io?.to(`dept:${departmentId}`).emit(event, payload);
  }

  toAdmins(event: RealtimeEvent, payload: unknown): void {
    this.io?.to('admin').emit(event, payload);
  }

  broadcast(event: RealtimeEvent, payload: unknown): void {
    this.io?.emit(event, payload);
  }
}