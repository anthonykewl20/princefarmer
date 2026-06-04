/**
 * Projectile — entity factory + tick helper.
 *
 * M2 ships no ranged weapons, so this is a minimal placeholder: the
 * entity contract (x, y, vx, vy, update, render) is in place so the
 * dungeon scene's projectile array loop doesn't break, but no actual
 * projectile spawning happens. M3+ will extend this with hit detection,
 * expiry, and per-weapon projectile types.
 */

const DEFAULT_SPEED = 5.0;

/**
 * Create a projectile entity.
 * @param {number} x
 * @param {number} y
 * @param {number} dirX
 * @param {number} dirY
 * @param {number} damage
 * @returns {object} projectile entity
 */
export function createProjectile(x, y, dirX, dirY, damage) {
  const len = Math.hypot(dirX, dirY) || 1;
  return {
    x, y,
    vx: (dirX / len) * DEFAULT_SPEED,
    vy: (dirY / len) * DEFAULT_SPEED,
    damage,
    alive: true,
    update(dt, world) { /* placeholder; M3+ adds motion + hit detection */ },
    render(ctx) {
      ctx.fillStyle = '#c89a3a';
      ctx.fillRect(this.x - 0.05, this.y - 0.05, 0.1, 0.1);
    },
  };
}
