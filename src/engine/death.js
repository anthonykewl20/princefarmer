/**
 * Death — pure helpers for the death-to-hub flow.
 *
 * The dungeon scene calls `triggerDeath` when it observes the player at
 * 0 HP, then transitions to the death scene. `isDead` is a small
 * predicate the scene uses to gate input/movement.
 */

/**
 * Mark the player as dead.
 * @param {{hp:number, isDead?:boolean}} player
 */
export function triggerDeath(player) {
  player.hp = 0;
  player.isDead = true;
}

/** @returns {boolean} */
export function isDead(player) {
  return player.isDead === true;
}
