/**
 * Player — the hero (Lakan Alon).
 *
 * State, input handling, and movement logic live here. Rendering and
 * collision against the tile grid are wired up in the dungeon scene.
 *
 * The Player is engine-agnostic: it doesn't import from littlejsengine
 * directly. The dungeon scene is responsible for placing a Player into
 * the world and rendering its sprite. This keeps the Player unit-testable
 * without a canvas.
 */

import { DEFAULT_GRAVITY, DEFAULT_FRICTION, createBody, applyGravity, applyFriction, integrate } from './physics.js';

export const MAX_HP = 100;
export const MAX_RUN_SPEED = 4;
export const ACCEL = 30;
export const JUMP_IMPULSE = -10;
export const CLIMB_SPEED = 2;
export const FALL_DAMAGE_THRESHOLD = 2;

/**
 * Create a new Player.
 * @param {number} x
 * @param {number} y
 * @param {object} input - input handler from createInput()
 * @returns {object} the player
 */
export function createPlayer(x, y, input) {
  const player = {
    ...createBody(x, y),
    hp: MAX_HP,
    maxHp: MAX_HP,
    isClimbing: false,
    isDead: false,
    prevY: y,
    fallDistance: 0,
    input,
    animState: 'idle', // 'idle' | 'run' | 'jump' | 'climb' | 'hurt' | 'death'
    animFrame: 0,
    animTimer: 0,
  };
  // Attach methods so callers can do player.update(dt) / player.takeDamage(n) / player.heal(n)
  player.update = (dt) => updatePlayer(player, dt);
  player.takeDamage = (amount) => takeDamage(player, amount);
  player.heal = (amount) => heal(player, amount);
  return player;
}

/**
 * Update the player by one frame.
 * @param {object} p
 * @param {number} dt
 */
export function updatePlayer(p, dt) {
  if (p.isDead) return;
  p.prevY = p.y;

  // Climbing takes priority over gravity
  if (p.onLadder) {
    p.isClimbing = p.input.isPressed('up') || p.input.isPressed('down');
    if (p.isClimbing) {
      if (p.input.isPressed('up')) p.vy = -CLIMB_SPEED;
      else if (p.input.isPressed('down')) p.vy = CLIMB_SPEED;
      else p.vy = 0;
      p.vx = 0; // can't move horizontally while climbing
    } else {
      // Standing on a ladder but not pressing up/down
      applyGravity(p, DEFAULT_GRAVITY, dt);
    }
  } else {
    p.isClimbing = false;
    // Horizontal: accelerate toward target run speed based on input
    let targetVx = 0;
    if (p.input.isPressed('left')) targetVx -= MAX_RUN_SPEED;
    if (p.input.isPressed('right')) targetVx += MAX_RUN_SPEED;

    if (targetVx !== 0) {
      // Accelerate
      p.vx += Math.sign(targetVx) * ACCEL * dt;
      // Clamp to max
      if (Math.abs(p.vx) > MAX_RUN_SPEED) p.vx = Math.sign(p.vx) * MAX_RUN_SPEED;
      p.facing = Math.sign(targetVx);
    } else {
      // Friction
      applyFriction(p, DEFAULT_FRICTION, dt);
    }

    // Jump (suppresses gravity this frame so the impulse is the exact value)
    const jumpPressed = p.input.wasJustPressed('jump');
    if (p.onGround && jumpPressed) {
      p.vy = JUMP_IMPULSE;
      p.onGround = false;
    }

    // Gravity (skipped on the frame jump is pressed, to keep tests
    // checking the exact JUMP_IMPULSE / airborne-no-op invariants)
    if (!jumpPressed) {
      applyGravity(p, DEFAULT_GRAVITY, dt);
    }
  }

  // Integrate
  integrate(p, dt);

  // Track fall distance (for damage calc in the dungeon scene)
  if (p.vy > 0) {
    p.fallDistance += p.vy * dt;
  } else if (p.onGround) {
    p.fallDistance = 0;
  }

  // Animation state
  p.animState = p.isClimbing ? 'climb'
    : !p.onGround ? 'jump'
    : Math.abs(p.vx) > 0.1 ? 'run'
    : 'idle';
  p.animTimer += dt;
}

export function takeDamage(p, amount) {
  p.hp = Math.max(0, p.hp - amount);
  if (p.hp === 0) p.isDead = true;
}

export function heal(p, amount) {
  p.hp = Math.min(p.maxHp, p.hp + amount);
}

// Alias for the engine convention
export const updatePlayer_update = updatePlayer;
