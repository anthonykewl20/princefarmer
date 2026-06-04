/**
 * HUD — heads-up display rendered as a 2D canvas overlay.
 *
 * For M1 this is just an HP bar. In M2+ it'll grow to include XP bar,
 * ability cooldown icons, and a class badge.
 */

import { xpForLevel } from '../engine/xpsystem.js';

const HUD_HEIGHT = 54;
const HUD_PADDING = 12;

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

/**
 * Draw the M2 combat HUD: single bottom bar with HP, XP, abilities,
 * plus a top-right level/zone label.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{hp:number,maxHp:number,xp:number,level:number}} player
 * @param {{id:string}} room
 * @param {{abilities:string[]}|null} weapon
 */
export function drawCombatHud(ctx, player, room, weapon) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // Top-right: level + zone
  ctx.fillStyle = '#f0f0f0';
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Lv ${player.level}`, w - HUD_PADDING, HUD_PADDING + 14);
  if (room?.id) {
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText(room.id, w - HUD_PADDING, HUD_PADDING + 30);
  }

  // Bottom strip background
  ctx.fillStyle = 'rgba(15, 15, 26, 0.92)';
  ctx.fillRect(0, h - HUD_HEIGHT, w, HUD_HEIGHT);

  // HP bar (left)
  const hpX = HUD_PADDING;
  const hpY = h - HUD_HEIGHT + 12;
  const hpW = (w - 2 * HUD_PADDING) * 0.4;
  const hpH = 18;
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(hpX, hpY, hpW, hpH);
  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = hpRatio > 0.5 ? '#5a8c5a' : hpRatio > 0.25 ? '#c89a3a' : '#c0392b';
  ctx.fillRect(hpX, hpY, Math.floor(hpW * hpRatio), hpH);
  ctx.fillStyle = '#f0f0f0';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`HP ${player.hp}/${player.maxHp}`, hpX + 4, hpY + 13);

  // XP bar (middle)
  const xpX = hpX + hpW + HUD_PADDING;
  const xpY = hpY + 5;
  const xpW = (w - 2 * HUD_PADDING) * 0.3;
  const xpH = 8;
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(xpX, xpY, xpW, xpH);
  const need = xpForLevel(player.level + 1);
  ctx.fillStyle = '#5a8cc8';
  ctx.fillRect(xpX, xpY, Math.floor(xpW * (player.xp / need)), xpH);
  ctx.fillStyle = '#888';
  ctx.font = '10px monospace';
  ctx.fillText(`XP ${player.xp}/${need}`, xpX + 4, xpY + 22);

  // Ability icons (right)
  const abilSize = 36;
  const abilX = w - HUD_PADDING - abilSize;
  const abilY = h - HUD_HEIGHT + (HUD_HEIGHT - abilSize) / 2;
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(abilX, abilY, abilSize, abilSize);
  ctx.strokeStyle = '#c89a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(abilX, abilY, abilSize, abilSize);
  ctx.fillStyle = '#c89a3a';
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚔', abilX + abilSize / 2, abilY + 24);
}
