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
import { createInput } from '../engine/input.js';

let sm = null;
export function setLoadoutStateMachine(s) { sm = s; }

export const loadoutScene = {
  name: 'loadout',

  enter(ctx = {}) {
    console.log('[scene] enter: loadout');
    this._player = ctx.player || null;
    // Fall back to createInput(globalThis) only when no input was supplied
    // via ctx and the scene's _input wasn't pre-set (e.g. by a unit test).
    this._input = ctx.input || this._input || createInput(globalThis);
    this._weapons = ctx.weapons || new Map();
    this._passives = ctx.passives || new Map();
    this._step = 'weapons';
    // GameDB doesn't have .keys(); fall back to idsWhere() when a registry
    // instance is passed in (e.g. from __pf.weapons in the E2E test).
    const weaponIds = typeof this._weapons.keys === 'function'
      ? Array.from(this._weapons.keys())
      : this._weapons.idsWhere(() => true);
    this._stepState = {
      weaponsList: weaponIds,
      mainPick: this._player?.loadout?.main?.weaponId || null,
      offhandPick: this._player?.loadout?.offhand?.weaponId || null,
      mainAbilities: this._weapons.get(this._player?.loadout?.main?.weaponId)?.abilities || [],
      offhandAbilities: this._weapons.get(this._player?.loadout?.offhand?.weaponId)?.abilities || [],
      abilitiesPicks: this._player?.loadout?.main?.abilitiesPicked?.slice() || [],
      passiveSlots: this._player?.loadout?.passives?.slice() || [null,null,null,null,null,null],
    };
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
    if (this._step === 'weapons') {
      this._commitWeapons();
      this._step = 'abilities';
    } else if (this._step === 'abilities') {
      this._commitAbilities();
      this._step = 'passives';
    } else if (this._step === 'passives') {
      this._commitPassives();
      if (sm) sm.transition('hub');
    }
  },

  _commitWeapons() {
    if (!this._player) return;
    this._player.loadout.main.weaponId = this._stepState.mainPick;
    this._player.loadout.offhand.weaponId = this._stepState.offhandPick;
    // Reset ability picks to match the new main weapon's pool
    const main = this._weapons.get(this._stepState.mainPick);
    if (main) {
      this._player.loadout.main.abilitiesPicked = [];
      this._stepState.abilitiesPicks = [];
    }
    const off = this._weapons.get(this._stepState.offhandPick);
    if (off) {
      this._player.loadout.offhand.abilitiesPicked = [];
    }
  },

  _commitAbilities() {
    if (!this._player) return;
    const mainWeapon = this._weapons.get(this._player.loadout.main.weaponId);
    if (mainWeapon) {
      const picks = this._stepState.abilitiesPicks.slice(0, 2);
      const result = validateAbilityPick(mainWeapon, picks);
      if (!result.ok) throw new Error(result.error);
      this._player.loadout.main.abilitiesPicked = picks;
    }
  },

  _commitPassives() {
    if (!this._player) return;
    const slots = this._stepState.passiveSlots.slice(0, 6);
    for (const id of slots) {
      if (id !== null && !this._passives?.has(id)) {
        throw new Error(`unknown passive: ${id}`);
      }
    }
    this._player.loadout.passives = slots;
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
