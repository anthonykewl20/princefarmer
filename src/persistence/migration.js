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
