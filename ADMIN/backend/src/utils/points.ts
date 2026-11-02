import { POINTS } from '../constants';

export interface PointsRule {
  /** Machine-readable reason stored on the points transaction. */
  reason: string;
  /** Points awarded (can be negative for penalties). */
  points: number;
}

/** Point rules keyed by the action that triggers them (README Section 21). */
export const POINT_RULES = {
  COMPLAINT_SUBMITTED: { reason: 'COMPLAINT_SUBMITTED', points: POINTS.COMPLAINT_SUBMITTED },
  USEFUL_PHOTO: { reason: 'USEFUL_PHOTO', points: POINTS.USEFUL_PHOTO },
  RESOLUTION_VERIFIED: { reason: 'RESOLUTION_VERIFIED', points: POINTS.RESOLUTION_VERIFIED },
  DUPLICATE_IDENTIFIED: { reason: 'DUPLICATE_IDENTIFIED', points: POINTS.DUPLICATE_IDENTIFIED },
  HELPFUL_COMMENT: { reason: 'HELPFUL_COMMENT', points: POINTS.HELPFUL_COMMENT },
  PENALTY_FALSE_REPORT: { reason: 'PENALTY_FALSE_REPORT', points: POINTS.PENALTY_FALSE_REPORT },
} as const satisfies Record<string, PointsRule>;

export type PointsRuleKey = keyof typeof POINT_RULES;

/** Badge definitions with the criteria understood by the awarding engine. */
export const BADGE_RULES = {
  FIRST_REPORT: { pointsThreshold: 10, description: 'Submitted your first valid complaint' },
  CIVIC_STARTER: { pointsThreshold: 25, description: 'Earned 25 points as a civic contributor' },
  NEIGHBORHOOD_HELPER: { pointsThreshold: 50, description: 'Earned 50 points helping your neighborhood' },
  VERIFIED_CONTRIBUTOR: { pointsThreshold: 75, description: 'Verified resolutions you reported' },
  CLEAN_STREETS_CHAMPION: { pointsThreshold: 150, description: 'Earned 150 points championing clean streets' },
  COMMUNITY_WATCHER: { pointsThreshold: 200, description: 'An active community watcher with 200 points' },
  CONSISTENT_CITIZEN: { pointsThreshold: 300, description: 'A consistently engaged citizen with 300 points' },
} as const;

export type BadgeRuleKey = keyof typeof BADGE_RULES;