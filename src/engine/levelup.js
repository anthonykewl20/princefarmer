/**
 * Level-up rewards — applied by the levelup scene's exit() hook.
 *
 * M2 rewards: +1 level, +5 maxHp, full HP restore, +1 attackPower.
 * The full-heal-on-level-up rule comes from the design spec: a
 * level-up is a meaningful power spike, not a minor bump.
 */

/**
 * Apply level-up rewards to the player in place.
 * @param {{level:number, maxHp:number, hp:number, attackPower:number}} player
 */
export function applyLevelUpRewards(player) {
  player.level++;
  player.maxHp += 5;
  player.hp = player.maxHp;
  player.attackPower += 1;
}
