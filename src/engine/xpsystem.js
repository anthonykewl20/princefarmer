/**
 * XP system — pure functions for level-up math.
 *
 * The dungeon scene calls `grantXp` whenever a gem is collected. If the
 * XP crosses a level threshold, the player levels up (potentially
 * multiple times in one call) and `pendingLevelUp` is set. The scene
 * checks this flag and transitions to the levelup scene.
 */

/**
 * XP required to advance FROM the given level.
 * Formula: 10 + (level - 1) * 5 → 10, 15, 20, 25, ...
 * @param {number} level
 * @returns {number}
 */
export function xpForLevel(level) {
  return 10 + (level - 1) * 5;
}

/**
 * Grant XP to a player. May trigger one or more level-ups in a single
 * call. Sets `player.pendingLevelUp = true` if any level-up occurred.
 * @param {{level:number, xp:number, pendingLevelUp:boolean}} player
 * @param {number} amount
 */
export function grantXp(player, amount) {
  player.xp += amount;
  let leveledUp = false;
  while (player.xp >= xpForLevel(player.level)) {
    player.xp -= xpForLevel(player.level);
    player.level++;
    leveledUp = true;
  }
  if (leveledUp) player.pendingLevelUp = true;
}
