/**
 * Hub scene.
 *
 * For M1, the hub is a small flat area with a single dungeon entrance.
 * Walking up to the entrance and pressing E transitions to the dungeon.
 *
 * Future: NPCs, farming plots, marketplace.
 */

import { createInput } from '../engine/input.js';

let sm = null;
let enterDungeon = null;
export function setHubStateMachine(s) { sm = s; }
export function setEnterDungeon(fn) { enterDungeon = fn; }

const ENTRANCE_X = 5;
const ENTRANCE_Y = 1;
const ENTRANCE_RADIUS = 1.5;

export const hubScene = {
  name: 'hub',
  enter(ctx = {}) {
    console.log('[scene] enter: hub');
    this._input = createInput(globalThis);
    this._playerX = 0;
    this._playerY = 1;
    // M2: when the hub is entered after death or a level-up, the scene
    // receives the player object in ctx. Restore HP to full and clear
    // any pending level-up so the player starts fresh.
    if (ctx.player) {
      ctx.player.hp = ctx.player.maxHp ?? 100;
      ctx.player.pendingLevelUp = false;
    }
    this._player = ctx.player || null;
  },
  exit() {
    console.log('[scene] exit: hub');
    this._input = null;
    this._player = null;
  },
  update(dt) {
    if (this._input.isPressed('left')) this._playerX -= 3 * dt;
    if (this._input.isPressed('right')) this._playerX += 3 * dt;
    if (this._input.isPressed('up')) this._playerY -= 3 * dt;
    if (this._input.isPressed('down')) this._playerY += 3 * dt;

    // M3: open loadout scene on L
    if (this._input.wasJustPressed('loadout') && this._player) {
      if (sm) sm.transition('loadout', { player: this._player });
      return;
    }

    const dx = this._playerX - ENTRANCE_X;
    const dy = this._playerY - ENTRANCE_Y;
    const nearEntrance = Math.hypot(dx, dy) < ENTRANCE_RADIUS;

    if (nearEntrance && this._input.wasJustPressed('interact')) {
      if (enterDungeon) enterDungeon('01-stub-sandbox', this._player);
    }
  },
  render(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, w, h);

    // World elements are drawn in world units (1 unit ≈ 1 tile). Scale the
    // canvas so they're visible at the chosen viewport resolution.
    ctx.save();
    const scale = 64;
    ctx.scale(scale, scale);

    // Dungeon entrance
    ctx.fillStyle = '#5a2a5a';
    ctx.fillRect(ENTRANCE_X - 0.5, ENTRANCE_Y - 1, 1, 2);
    // Player
    ctx.fillStyle = '#f4c089';
    ctx.fillRect(this._playerX - 0.3, this._playerY - 0.6, 0.6, 0.6);

    ctx.restore();

    // Prompt (in pixel space so the text is readable)
    const dx = this._playerX - ENTRANCE_X;
    const dy = this._playerY - ENTRANCE_Y;
    if (Math.hypot(dx, dy) < ENTRANCE_RADIUS) {
      ctx.fillStyle = '#f0f0f0';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Press E to enter', ENTRANCE_X * scale, (ENTRANCE_Y + 2) * scale);
    }
  },
};
