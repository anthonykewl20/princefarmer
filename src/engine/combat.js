/**
 * Combat — pure functions for hit resolution and shape-based collision.
 *
 * All hit detection in the game flows through `resolveShape` so the per-
 * weapon hit shape (arc, line, circle, cone) is a property of the JSON
 * template, not a hard-coded check in the scene.
 */

// Note: crit roll and damage are computed locally in `applyHit` so the
// `attacker.attackPower` modifier can be applied before the crit check,
// keeping the formula explicit.

/**
 * Check whether a target is inside an attacker's hit shape.
 * @param {{x:number,y:number,facing:number}} attacker
 * @param {{x:number,y:number}} target
 * @param {{shape:string,arc?:number,radius?:number,range?:number,thickness?:number}} shape
 * @returns {boolean}
 */
export function resolveShape(attacker, target, shape) {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const dist = Math.hypot(dx, dy);

  if (shape.shape === 'arc' || shape.shape === 'cone') {
    if (dist > (shape.radius ?? Infinity)) return false;
    // facing: 1 = right (+x), -1 = left (-x)
    const facingX = attacker.facing;
    const facingY = 0;
    // angle between (facing) and (attacker→target)
    const cos = (dx * facingX + dy * facingY) / (dist || 1);
    const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
    return angle <= (shape.arc ?? Math.PI) / 2;
  }

  if (shape.shape === 'circle') {
    return dist <= (shape.radius ?? Infinity);
  }

  if (shape.shape === 'line') {
    if (Math.abs(dx) > (shape.range ?? Infinity)) return false;
    // distance from the line (attacker → (attacker.x + facing*range, attacker.y))
    // The line is horizontal here (y stays at attacker.y). thickness is the
    // half-width of the line hitbox.
    return Math.abs(dy) <= (shape.thickness ?? 0.1);
  }

  return false;
}

/**
 * Apply a hit to a target with crit rolled by the supplied RNG.
 *
 * Damage formula: `floor(base * (1 + 0.1 * (attackPower - 1)) * (isCrit ? 1.5 : 1))`
 * Crit chance: 10% (rng() < 0.1).
 *
 * @param {{hp:number,maxHp:number,isDead?:boolean}} target - mutated in
 *   place: `hp` is reduced, `isDead` is set when `hp` reaches 0.
 * @param {number} baseDamage
 * @param {{attackPower:number}} attacker
 * @param {() => number} rng - seeded RNG returning [0, 1)
 * @returns {{damage:number, crit:boolean, killed:boolean}}
 */
export function applyHit(target, baseDamage, attacker, rng) {
  const isCrit = rng() < 0.1;
  const attackModifier = 1 + 0.1 * (attacker.attackPower - 1);
  const damage = Math.floor(baseDamage * attackModifier * (isCrit ? 1.5 : 1));
  target.hp = Math.max(0, target.hp - damage);
  const killed = target.hp === 0;
  if (killed) target.isDead = true;
  return { damage, crit: isCrit, killed };
}
