/**
 * Passive drop — pure module for level-up choice selection.
 *
 * Returns `count` choices for the player. Each choice is either:
 *  - a passive id (string): the player doesn't yet own this passive
 *  - { kind: 'stack', passiveId }: the player owns this passive and
 *    has room to add another stack (slot count < maxStacks)
 *
 * Selection rules:
 *  - Tier weights: 60% tier 1, 30% tier 2, 10% tier 3.
 *  - Never offer a passive the player already owns.
 *  - If the player owns every passive, fall back to stack-upgrades.
 */

const TIER_WEIGHTS = { 1: 0.6, 2: 0.3, 3: 0.1 };

/**
 * @param {{ownedPassives:Set<string>, loadout:{passives:(string|null)[]}}} player
 * @param {Array<{id:string,maxStacks:number,tier:number}>} registry
 * @param {number} count
 * @param {() => number} rng
 * @returns {Array<string|{kind:'stack',passiveId:string}>}
 */
export function pickPassiveChoices(player, registry, count = 3, rng = Math.random) {
  const owned = player.ownedPassives instanceof Set
    ? player.ownedPassives
    : new Set(player.ownedPassives || []);
  const loadout = player.loadout || { passives: [] };
  const slots = loadout.passives || [];

  const unowned = registry.filter((p) => !owned.has(p.id));
  const out = [];
  const used = new Set();

  for (let i = 0; i < count; i++) {
    if (unowned.length > 0) {
      // Tier-weighted pick from unowned
      const tier = pickTier(rng);
      const tierPool = unowned.filter((p) => p.tier === tier && !used.has(p.id));
      const pool = tierPool.length > 0 ? tierPool : unowned.filter((p) => !used.has(p.id));
      if (pool.length > 0) {
        const pick = pool[Math.floor(rng() * pool.length)];
        used.add(pick.id);
        out.push(pick.id);
        continue;
      }
    }
    // Fallback: stack-upgrade
    const stack = pickStackUpgrade(registry, slots, used, rng);
    if (stack) {
      used.add(stack.passiveId);
      out.push(stack);
    }
  }
  return out;
}

function pickTier(rng) {
  const r = rng();
  if (r < TIER_WEIGHTS[1]) return 1;
  if (r < TIER_WEIGHTS[1] + TIER_WEIGHTS[2]) return 2;
  return 3;
}

function pickStackUpgrade(registry, slots, used, rng) {
  // count how many slots each owned passive occupies
  const counts = new Map();
  for (const id of slots) {
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  // find passives in the registry that have room to grow
  const candidates = registry.filter((p) => {
    if (used.has(p.id)) return false;
    const current = counts.get(p.id) || 0;
    return current < p.maxStacks;
  });
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(rng() * candidates.length)];
  return { kind: 'stack', passiveId: pick.id };
}
