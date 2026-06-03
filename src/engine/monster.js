/**
 * Monster — entity factory + tick helper.
 *
 * M2 ships one monster (aswang). The factory returns a plain object
 * with the entity contract (x, y, vx, vy, update, render). The scene
 * owns the array of monsters and calls `tickMonster` for each.
 *
 * Monster AI is delegated to a behavior function registered in
 * `src/engine/behaviors/index.js`. The behavior reads the player and
 * world, writes the monster's vx/vy/action/lungeTimer/facing.
 *
 * After the behavior runs, `tickMonster` integrates motion and flips
 * `strafeSign` so orbital behaviors (e.g. strafe-lunge) alternate
 * direction each frame.
 */

import { integrate } from './physics.js';
import { BEHAVIORS } from './behaviors/index.js';

/**
 * Create a monster entity.
 * @param {object} template - from data/monsters.json
 * @param {number} x
 * @param {number} y
 * @returns {object} monster entity
 */
export function createMonster(template, x, y) {
  return {
    id: template.id,
    x, y, vx: 0, vy: 0,
    hp: template.hp,
    maxHp: template.hp,
    damage: template.damage,
    speed: template.speed,
    contactRange: template.contactRange,
    action: 'idle',
    lungeTimer: 0,
    strafeSign: 1,
    facing: 1,
    template,
    alive: true,
    update(dt, world) { tickMonster(this, dt, world); },
    render(ctx) { drawMonster(this, ctx); },
  };
}

/**
 * Tick a monster: invoke its behavior, flip strafe sign, integrate.
 * @param {object} m
 * @param {number} dt
 * @param {{player:{x:number,y:number}, grid?:object, monsters?:object[], gems?:object[]}} world
 */
export function tickMonster(m, dt, world) {
  const fn = BEHAVIORS[m.template.behavior];
  if (fn) fn(m, dt, world);
  if (m.action === 'strafe') m.strafeSign *= -1;
  integrate(m, dt);
}

/**
 * Placeholder renderer — filled rect sized by contact range.
 * Replaced by PixelLab-generated sprite in M2.1.
 */
function drawMonster(m, ctx) {
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(m.x - 0.4, m.y - 0.4, 0.8, 0.8);
}
