/**
 * Pricing logic: legacy users (created before the pricing change) see $5.99,
 * new users see $9.99.
 */

// Cutoff: accounts created before this date are "legacy" ($5.99)
const PRICING_CUTOFF = new Date("2026-04-09T00:00:00Z");

export const PRICE_LEGACY = "$5.99";
export const PRICE_NEW = "$9.99";

export function isLegacyUser(createdAt: string | Date | null | undefined): boolean {
  if (!createdAt) return false;
  return new Date(createdAt) < PRICING_CUTOFF;
}

export function getUserPrice(createdAt: string | Date | null | undefined): string {
  return isLegacyUser(createdAt) ? PRICE_LEGACY : PRICE_NEW;
}
