/**
 * Damage system.
 *
 * For M1, the only source is fall damage (height-based). Combat damage
 * is added in M2 when weapons and monsters come online.
 */

/** Maximum HP for the player. */
export const MAX_HP = 100;

/** Falls below this height (in world units) deal no damage. */
export const SAFE_FALL_HEIGHT = 2;

/** Falls at or above this height deal lethal damage. */
export const LETHAL_FALL_HEIGHT = 10;

/**
 * Calculate HP damage from a fall of `distance` world units.
 * Linear interpolation between SAFE_FALL_HEIGHT and LETHAL_FALL_HEIGHT.
 * @param {number} distance
 * @returns {number} damage (0..MAX_HP)
 */
export function calculateFallDamage(distance) {
  if (distance <= SAFE_FALL_HEIGHT) return 0;
  if (distance >= LETHAL_FALL_HEIGHT) return MAX_HP;
  const t = (distance - SAFE_FALL_HEIGHT) / (LETHAL_FALL_HEIGHT - SAFE_FALL_HEIGHT);
  return Math.round(MAX_HP * t);
}
