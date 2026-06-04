/**
 * Migrate a save forward to the current version.
 *
 * If no `currentVersion` or `upgrades` are passed, defaults to a v1-only system
 * (any save with version !== 1 throws).
 *
 * @param {object} save - the save object (must have a `version` field)
 * @param {object} [options]
 * @param {number} [options.currentVersion=1] - the latest version
 * @param {Object<number, (s: object) => object>} [options.upgrades] - map of target version -> upgrade fn
 * @returns {object} the migrated save
 */
export function migrate(save, options = {}) {
  if (!save || typeof save.version !== 'number') {
    throw new Error('migrate: save is missing a numeric version field');
  }
  const currentVersion = options.currentVersion ?? 1;
  const upgrades = options.upgrades ?? {};

  if (save.version > currentVersion) {
    throw new Error(`migrate: save is from a future version (${save.version} > ${currentVersion})`);
  }

  let s = save;
  for (let v = s.version + 1; v <= currentVersion; v++) {
    const upgrade = upgrades[v];
    if (!upgrade) {
      throw new Error(`migrate: no upgrade path defined to version ${v}`);
    }
    s = upgrade(s);
  }
  return s;
}

/**
 * M2 v1 → v2 upgrade.
 *
 * v1 → v2 adds combat state to the player (level, xp, attackPower) and a
 * default weapons array seeded with the M2 starting weapon (kampilan).
 * Existing fields are preserved (re-runs are safe — fields are not
 * overwritten if already present).
 *
 * @param {object} s - v1 save
 * @returns {object} v2 save
 */
export function migrateV1ToV2(s) {
  return {
    ...s,
    version: 2,
    player: {
      ...s.player,
      level: s.player.level ?? 1,
      xp: s.player.xp ?? 0,
      attackPower: s.player.attackPower ?? 1,
    },
    weapons: s.weapons ?? [
      { slot: 'main', id: 'kampilan', abilitiesPicked: [] },
    ],
  };
}

/**
 * M3 v2 → v3 upgrade.
 *
 * Adds weapons[] (with a default kampilan), the empty passive loadout
 * (6 slots), ownedPassives, and evolutionState. Existing weapons are
 * preserved; existing fields are never overwritten.
 */
export function migrateV2ToV3(s) {
  return {
    ...s,
    version: 3,
    weapons: s.weapons ?? [
      { slot: 'main', id: 'kampilan', abilitiesPicked: ['lunging-strike', 'sweep'] },
    ],
    loadout: s.loadout ?? { passives: [null, null, null, null, null, null] },
    ownedPassives: s.ownedPassives ?? [],
    evolutionState: s.evolutionState ?? {},
  };
}

/** Registry of game-specific upgrades, keyed by target version. */
export const UPGRADES = {
  2: migrateV1ToV2,
  3: migrateV2ToV3,
};
