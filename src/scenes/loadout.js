/**
 * Loadout scene — 3-step wizard for the build system.
 *
 * Steps:
 *  1. weapons  — pick main + offhand
 *  2. abilities — for each weapon, pick 2 of its 4 abilities
 *  3. passives  — fill 6 slots from ownedPassives
 *
 * Press Enter to advance a step. Esc cancels and returns to hub.
 * On the final step, Enter persists the loadout to the player and
 * transitions back to hub.
 */

import { validateAbilityPick } from '../engine/build.js';

let sm = null;
export function setLoadoutStateMachine(s) { sm = s; }

export const loadoutScene = {
  name: 'loadout',

  enter(ctx = {}) {
    this._player = ctx.player || null;
    if (ctx.input) this._input = ctx.input; // tests can inject; main.js wires real input
    this._step = 'weapons';
    this._stepState = {};
  },

  exit() {
    this._player = null;
    this._input = null;
    this._step = null;
    this._stepState = null;
  },

  update(dt) {
    if (!this._input) return;
    if (this._input.wasJustPressed('escape')) {
      if (sm) sm.transition('hub');
      return;
    }
    if (this._input.wasJustPressed('interact')) {
      this._advance();
    }
  },

  _advance() {
    if (this._step === 'weapons') this._step = 'abilities';
    else if (this._step === 'abilities') this._step = 'passives';
    else if (this._step === 'passives') {
      // Finalize: persist loadout to player (mutates in place)
      // Each step's picker writes to player.loadout directly; this is a hook
      // for any post-pick validation in a future task.
      if (sm) sm.transition('hub');
    }
  },

  render(ctx) {
    // Rendered by the per-step subcomponents; skeleton draws a placeholder.
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f0f0f0';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LOADOUT — ${this._step || '?'}`, w / 2, 60);
  },
};
