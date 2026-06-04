/**
 * Level-up scene.
 *
 * Shows a "LEVEL UP!" flash for 1.0s, then offers the player 3 passive
 * choices (M3). On Enter, the picked passive is added to
 * `ownedPassives` and (if a null slot exists) placed in
 * `loadout.passives`. The scene then transitions back to the dungeon.
 * The baseline rewards (level++, maxHp, full HP, attackPower) are
 * applied in exit() so the dungeon scene resumes with the player in
 * the post-level-up state.
 */

import { applyLevelUpRewards } from '../engine/levelup.js';
import { pickPassiveChoices } from '../engine/passivedrop.js';
import { serializePlayerToSave } from '../engine/player.js';
import { SaveManager } from '../persistence/save.js';

const FLASH_DURATION = 1.0; // seconds

export const levelupScene = {
  name: 'levelup',

  enter(ctx = {}) {
    this._timer = 0;
    this._dungeonId = ctx.dungeonId;
    this._player = ctx.player;
    this._weapons = ctx.weapons || new Map();
    this._passives = ctx.passives || [];
    this._input = ctx.input || null;
    this._choices = pickPassiveChoices(
      this._player || { ownedPassives: [], loadout: { passives: [] } },
      this._passives,
      3,
      Math.random,
    );
  },

  exit() {
    if (this._player) {
      applyLevelUpRewards(this._player);
      this._player.pendingLevelUp = false;
      SaveManager.save(serializePlayerToSave(this._player)).catch(() => {});
    }
  },

  update(dt) {
    this._timer += dt;
    if (this._timer < FLASH_DURATION) return;
    // After flash: pick a passive on Enter
    if (this._input && this._input.wasJustPressed('interact') && this._choices.length > 0) {
      const pick = this._choices[0]; // M3: first choice; future: arrow-key selection
      if (typeof pick === 'string') {
        // New passive
        this._player.ownedPassives = [...(this._player.ownedPassives || []), pick];
        const slots = this._player.loadout.passives.slice();
        const emptyIdx = slots.findIndex((s) => s === null);
        if (emptyIdx !== -1) slots[emptyIdx] = pick;
        this._player.loadout.passives = slots;
      } else if (pick.kind === 'stack') {
        const slots = this._player.loadout.passives.slice();
        const emptyIdx = slots.findIndex((s) => s === null);
        if (emptyIdx !== -1) slots[emptyIdx] = pick.passiveId;
        this._player.loadout.passives = slots;
      }
      if (this._stateMachine) {
        this._stateMachine.transition('dungeon', { dungeonId: this._dungeonId, player: this._player });
      }
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
