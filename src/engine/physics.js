/**
 * Body is the data shape for anything physics-enabled in the game.
 * The Body struct is intentionally engine-agnostic — it has no
 * reference to LittleJS or any rendering layer.
 */

/** Default gravity in units/sec². */
export const DEFAULT_GRAVITY = 30;

/** Default ground friction in units/sec². */
export const DEFAULT_FRICTION = 12;

/** Default fixed timestep in seconds (LittleJS runs at ~60fps). */
export const DEFAULT_DT = 1 / 60;

/**
 * Create a new Body at the given position.
 * @param {number} x
 * @param {number} y
 * @param {object} [overrides]
 * @returns {object} the body
 */
export function createBody(x, y, overrides = {}) {
  return {
    x, y,
    vx: overrides.vx ?? 0,
    vy: overrides.vy ?? 0,
    onGround: overrides.onGround ?? true,
    onLadder: overrides.onLadder ?? false,
    onLedge: overrides.onLedge ?? false,
    facing: overrides.facing ?? 1, // 1 = right, -1 = left
  };
}

/**
 * Apply gravity to a body's vy. Pure side-effect; mutates `body`.
 * @param {object} body
 * @param {number} [gravity=DEFAULT_GRAVITY]
 * @param {number} [dt=DEFAULT_DT]
 */
export function applyGravity(body, gravity = DEFAULT_GRAVITY, dt = DEFAULT_DT) {
  body.vy += gravity * dt;
}

/**
 * Apply friction to a body's vx. Pure side-effect; mutates `body`.
 * Friction only opposes motion — it never reverses it.
 * @param {object} body
 * @param {number} [friction=DEFAULT_FRICTION]
 * @param {number} [dt=DEFAULT_DT]
 */
export function applyFriction(body, friction = DEFAULT_FRICTION, dt = DEFAULT_DT) {
  if (body.vx === 0) return;
  const drop = friction * dt;
  if (Math.abs(body.vx) <= drop) {
    body.vx = 0;
  } else {
    body.vx -= Math.sign(body.vx) * drop;
  }
}

/**
 * Integrate a body by its current velocity. Pure side-effect; mutates `body`.
 * @param {object} body
 * @param {number} [dt=DEFAULT_DT]
 */
export function integrate(body, dt = DEFAULT_DT) {
  body.x += body.vx * dt;
  body.y += body.vy * dt;
}

/** @returns {boolean} the body's onGround flag */
export function isOnGround(body) {
  return body.onGround;
}
