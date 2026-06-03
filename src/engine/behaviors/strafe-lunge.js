/**
 * Aswang AI: strafe + lunge.
 *
 * Per the M2 design:
 *   dist > 3.0       → walk toward the player
 *   1.5 < dist ≤ 3.0 → strafe perpendicular (alternates sign each tick)
 *   dist ≤ 1.5       → lunge if cooldown ready, else idle
 *
 * Lunge: 3.0 u/s for the duration of the tick, 1.5s cooldown.
 * Strafe: 0.7 × speed perpendicular.
 */

const LUNGE_RANGE = 1.5;
const APPROACH_RANGE = 3.0;
const LUNGE_COOLDOWN = 1.5;
const LUNGE_SPEED_MULT = 2.0;
const STRAFE_SPEED_MULT = 0.7;

/**
 * @param {object} monster
 * @param {number} dt
 * @param {{player:{x:number,y:number}}} world
 */
export function strafeLunge(monster, dt, world) {
  const dx = world.player.x - monster.x;
  const dy = world.player.y - monster.y;
  const dist = Math.hypot(dx, dy);

  // Decrement cooldown first so a freshly-triggered lunge starts at the
  // full LUNGE_COOLDOWN value rather than LUNGE_COOLDOWN - dt.
  monster.lungeTimer = Math.max(0, monster.lungeTimer - dt);

  if (dist > APPROACH_RANGE) {
    // Walk toward
    monster.action = 'strafe'; // treated as "approach" by the motion code
    monster.vx = (dx / dist) * monster.speed;
    monster.vy = (dy / dist) * monster.speed;
  } else if (dist > LUNGE_RANGE) {
    // Strafe perpendicular (alternates sign via strafeSign)
    monster.action = 'strafe';
    const perpX = -dy / dist;
    const perpY = dx / dist;
    monster.vx = perpX * monster.strafeSign * monster.speed * STRAFE_SPEED_MULT;
    monster.vy = perpY * monster.strafeSign * monster.speed * STRAFE_SPEED_MULT;
  } else {
    // In lunge range
    if (monster.lungeTimer <= 0) {
      monster.action = 'lunge';
      monster.vx = (dx / dist) * monster.speed * LUNGE_SPEED_MULT;
      monster.vy = (dy / dist) * monster.speed * LUNGE_SPEED_MULT;
      monster.lungeTimer = LUNGE_COOLDOWN;
    } else {
      monster.action = 'idle';
      monster.vx = 0;
      monster.vy = 0;
    }
  }

  monster.facing = Math.sign(dx) || monster.facing;
}
