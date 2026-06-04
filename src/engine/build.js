/**
 * Build system — pure functions for loadout validation, evolution, and
 * element math.
 *
 * No game state, no entity references. All inputs are plain objects.
 */

import { isElement } from './elements.js';

/**
 * Check whether `abilityId` is one of the weapon's pickable abilities.
 */
export function canPickAbility(weapon, abilityId) {
  if (!abilityId) return false;
  return Array.isArray(weapon?.abilities) && weapon.abilities.includes(abilityId);
}

/**
 * Validate a player's 2-ability pick for a single weapon slot.
 * @returns {{ok:true} | {ok:false, error:string}}
 */
export function validateAbilityPick(weapon, picked) {
  if (!Array.isArray(picked) || picked.length !== 2) {
    return { ok: false, error: 'must pick exactly 2 abilities' };
  }
  if (picked[0] === picked[1]) {
    return { ok: false, error: 'cannot pick the same ability twice' };
  }
  for (const a of picked) {
    if (!canPickAbility(weapon, a)) {
      return { ok: false, error: `${a} is not on ${weapon.id}` };
    }
  }
  return { ok: true };
}

/**
 * Count how many slots in `loadout.passives` contain the given passive id.
 */
export function countPassiveInLoadout(loadout, passiveId) {
  if (!loadout || !Array.isArray(loadout.passives)) return 0;
  return loadout.passives.filter((p) => p === passiveId).length;
}
