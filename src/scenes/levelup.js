/**
 * Level-up scene.
 *
 * Shows a "LEVEL UP!" flash for 1.0s, then transitions back to the
 * dungeon. The rewards (level++, maxHp, full HP, attackPower) are
 * applied in exit() so the dungeon scene resumes with the player in
 * the post-level-up state.
 */

import { applyLevelUpRewards } from '../engine/levelup.js';
import { SaveManager } from '../persistence/save.js';

const FLASH_DURATION = 1.0; // seconds

export const levelupScene = {
  name: 'levelup',
  enter(ctx = {}) {
    this._timer = 0;
    this._dungeonId = ctx.dungeonId;
    this._player = ctx.player;
  },
  exit() {
    if (this._player) {
      applyLevelUpRewards(this._player);
      this._player.pendingLevelUp = false;
      try { SaveManager.save(this._player); } catch (e) { /* best-effort */ }
    }
  },
  update(dt) {
    this._timer += dt;
    if (this._timer >= FLASH_DURATION) {
      this._stateMachine.transition('dungeon', { dungeonId: this._dungeonId, player: this._player });
    }
  },
  render(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5a8c5a';
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP!', w / 2, h / 2);
    ctx.fillStyle = '#888';
    ctx.font = '20px monospace';
    ctx.fillText(`Lv ${this._player?.level ?? '?'} · HP restored · +1 ATK`, w / 2, h / 2 + 48);
  },
};
