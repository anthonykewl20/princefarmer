/**
 * Camera controller.
 *
 * Smoothly follows a target (usually the player) with simple lerp damping.
 * Clamps to room bounds so the camera doesn't show void outside the level.
 *
 * The Camera object is plain data; consumers (main.js, dungeon scene)
 * call `updateCamera(cam, target, dt)` each frame and read `cam.x`, `cam.y`,
 * `cam.scale` to drive LittleJS's `setCameraPos` / `setCameraScale`.
 */

/** Default lerp factor — fraction of distance covered per second. */
export const DEFAULT_LERP = 4;

/**
 * Create a new Camera centered on the target.
 * @param {{x:number, y:number}} target
 * @param {{width:number, height:number}} room - room bounds in world units
 * @returns {object} the camera
 */
export function createCamera(target, room) {
  return {
    x: target.x,
    y: target.y,
    scale: 1,
    room,
    target,
  };
}

/**
 * Update camera toward target. Mutates the camera.
 * @param {object} cam
 * @param {{x:number, y:number}} target
 * @param {number} dt - delta time in seconds
 * @param {number} [lerp=DEFAULT_LERP] - higher = snappier
 */
export function updateCamera(cam, target, dt, lerp = DEFAULT_LERP) {
  // Exponential lerp: approach fraction = 1 - exp(-lerp * dt)
  const t = 1 - Math.exp(-lerp * dt);
  cam.x += (target.x - cam.x) * t;
  cam.y += (target.y - cam.y) * t;

  // Clamp to room bounds (camera is centered on the target by default;
  // clamp by half-room so the camera doesn't see past the room edges)
  const halfW = cam.room.width / 2;
  const halfH = cam.room.height / 2;
  // Only clamp when the room is bigger than the viewport; for the M1 stub
  // room this is usually a no-op.
  if (cam.room.width > 0) {
    cam.x = Math.max(-halfW, Math.min(halfW, cam.x));
  }
  if (cam.room.height > 0) {
    cam.y = Math.max(-halfH, Math.min(halfH, cam.y));
  }
}
