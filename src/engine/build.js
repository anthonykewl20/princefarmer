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

/**
 * Collect the distinct elements touched by the weapons and the
 * passives currently in the loadout's passive slots.
 */
export function distinctElementsInLoadout(loadout, passiveRegistry) {
  const out = new Set();
  if (!loadout) return out;
  if (loadout.main?.element) out.add(loadout.main.element);
  if (loadout.offhand?.element) out.add(loadout.offhand.element);
  if (Array.isArray(loadout.passives) && passiveRegistry) {
    for (const pid of loadout.passives) {
      if (!pid) continue;
      const p = passiveRegistry.get(pid);
      if (p?.element) out.add(p.element);
    }
  }
  return out;
}

/**
 * Compute the damage multiplier from element-affinity passives.
 * Base 1.0. +0.15 per loadout slot whose passive has the same element
 * as the ability. Returns {multiplier, dominantElement}.
 */
export function computeElementMultiplier(loadout, ability, passiveRegistry) {
  if (!ability?.element || !isElement(ability.element)) {
    return { multiplier: 1, dominantElement: null };
  }
  let matchingSlots = 0;
  if (Array.isArray(loadout?.passives) && passiveRegistry) {
    for (const pid of loadout.passives) {
      if (!pid) continue;
      const p = passiveRegistry.get(pid);
      if (p?.element === ability.element) matchingSlots++;
    }
  }
  return { multiplier: 1 + 0.15 * matchingSlots, dominantElement: ability.element };
}

/**
 * Compute the multi-element combo bonus.
 * 3+ distinct elements → 1.10. 5+ distinct elements → 1.25. Else 1.00.
 */
export function computeComboBonus(loadout, passiveRegistry) {
  const n = distinctElementsInLoadout(loadout, passiveRegistry).size;
  if (n >= 5) return 1.25;
  if (n >= 3) return 1.10;
  return 1;
}
