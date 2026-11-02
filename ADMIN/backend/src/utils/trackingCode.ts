import { customAlphabet } from 'nanoid';

/**
 * Human-friendly tracking code: JM-XXXXXX-YYYY (uppercase, no ambiguous chars).
 * Returned to the citizen so they can look the complaint up without auth.
 */
const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const nanoid = customAlphabet(alphabet, 10);

export function generateTrackingCode(): string {
  const id = nanoid();
  return `JM-${id.slice(0, 6)}-${id.slice(6)}`;
}