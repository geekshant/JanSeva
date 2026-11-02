import { ComplaintStatus, ComplaintCategory, SlaState } from '../constants';
import { CATEGORY_SLA_HOURS, DEFAULT_SLA_HOURS } from '../constants/sla';

export interface SlaDeadline {
  slaHours: number;
  slaDueAt: Date;
}

/**
 * Complaints due within this many hours are reported as `DUE_SOON`.
 *
 * A single absolute threshold is used everywhere (state derivation below and
 * the `?sla=DUE_SOON` list filter) so the two always agree. Deriving it from a
 * fixed SLA window instead — as this used to — produced a threshold of
 * ~33.6h (20% of the 168h `OTHER` window) that had nothing to do with the
 * complaint's own deadline.
 */
export const DUE_SOON_HOURS = 24;
export const DUE_SOON_MS = DUE_SOON_HOURS * 60 * 60 * 1000;

/** Compute the SLA deadline for a complaint based on its category. */
export function computeSlaDeadline(
  category: ComplaintCategory,
  createdAt: Date = new Date(),
): SlaDeadline {
  const slaHours = CATEGORY_SLA_HOURS[category] ?? DEFAULT_SLA_HOURS;
  const slaDueAt = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
  return { slaHours, slaDueAt };
}

/**
 * Derive the SLA state relative to now.
 * Active states that are monitored against the deadline:
 * SUBMITTED, UNDER_REVIEW, ASSIGNED, IN_PROGRESS, REOPENED.
 */
export function evaluateSlaState(
  status: ComplaintStatus,
  slaDueAt: Date | null | undefined,
  now: Date = new Date(),
): SlaState {
  if (status === 'RESOLVED' || status === 'VERIFIED') return 'RESOLVED';
  if (status === 'REJECTED' || status === 'DUPLICATE') return 'RESOLVED';
  if (!slaDueAt) return 'ON_TRACK';

  const remainingMs = slaDueAt.getTime() - now.getTime();
  if (remainingMs < 0) return 'OVERDUE';

  // DUE_SOON when the deadline falls inside the fixed warning window.
  return remainingMs <= DUE_SOON_MS ? 'DUE_SOON' : 'ON_TRACK';
}

export function isSlaOverdue(
  status: ComplaintStatus,
  slaDueAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (slaDueAt === null || slaDueAt === undefined) return false;
  if (['RESOLVED', 'VERIFIED', 'REJECTED', 'DUPLICATE'].includes(status)) return false;
  return slaDueAt.getTime() < now.getTime();
}