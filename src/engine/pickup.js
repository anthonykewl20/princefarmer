/**
 * Pickup (XP gem) — entity factory + tick helper.
 *
 * When a monster dies, the dungeon scene spawns a gem at the monster's
 * position. The gem sits still until the player comes within
 * PICKUP_RADIUS; then it homes in. On contact, the player gains XP and
 * the gem is marked dead (the scene filters dead entities each frame).
 */

import { integrate } from './physics.js';
import { grantXp } from './xpsystem.js';

const PICKUP_RADIUS = 2.5;
const COLLECT_RADIUS = 0.3;
const HOMING_ACCEL = 25; // units/sec^2 along player direction

/**
 * Create an XP gem entity.
 * @param {number} x
 * @param {number} y
 * @param {number} amount - XP value when collected
 * @returns {object} gem entity
 */
export function createXpGem(x, y, amount) {
  return {
    kind: 'xp',
    x, y, vx: 0, vy: 0,
    amount,
    alive: true,
    update(dt, world) { tickXpGem(this, dt, world.player); },
    render(ctx) { drawXpGem(this, ctx); },
  };
}

/**
 * Tick an XP gem: home toward the player if in range, collect on contact.
 * @param {object} gem
 * @param {number} dt
 * @param {{x:number,y:number,xp:number,level:number,pendingLevelUp:boolean}} player
 */
export function tickXpGem(gem, dt, player) {
  const dx = player.x - gem.x;
  const dy = player.y - gem.y;
  const dist = Math.hypot(dx, dy);

  if (dist > COLLECT_RADIUS && dist < PICKUP_RADIUS && dist > 0.001) {
    gem.vx += (dx / dist) * HOMING_ACCEL * dt;
    gem.vy += (dy / dist) * HOMING_ACCEL * dt;
  }
  integrate(gem, dt);

  // Re-check after integration
  const finalDx = player.x - gem.x;
  const finalDy = player.y - gem.y;
  const finalDist = Math.hypot(finalDx, finalDy);
  if (finalDist < COLLECT_RADIUS) {
    grantXp(player, gem.amount);
    gem.alive = false;
  }
}

function drawXpGem(gem, ctx) {
  ctx.fillStyle = '#5a8cc8';
  ctx.fillRect(gem.x - 0.1, gem.y - 0.1, 0.2, 0.2);
}
