/**
 * HUD — heads-up display rendered as a 2D canvas overlay.
 *
 * For M1 this is just an HP bar. In M2+ it'll grow to include XP bar,
 * ability cooldown icons, and a class badge.
 */

/**
 * Draw the HP bar at the given screen-space position.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{hp:number, maxHp:number}} player
 * @param {number} width - bar width in pixels
 * @param {number} height - bar height in pixels
 * @param {number} x - top-left x in pixels
 * @param {number} y - top-left y in pixels
 */
export function drawHud(ctx, player, width = 200, height = 20, x = 16, y = 16) {
  const ratio = player.hp / player.maxHp;

  // Background
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(x, y, width, height);

  // HP fill
  ctx.fillStyle = ratio > 0.5 ? '#5a8c5a' : ratio > 0.25 ? '#c89a3a' : '#c0392b';
  ctx.fillRect(x, y, Math.floor(width * ratio), height);

  // Border
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(x, y, width, 1);                  // top
  ctx.fillRect(x, y + height - 1, width, 1);     // bottom
  ctx.fillRect(x, y, 1, height);                 // left
  ctx.fillRect(x + width - 1, y, 1, height);     // right
}
