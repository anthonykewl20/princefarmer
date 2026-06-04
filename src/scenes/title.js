/**
 * Title scene.
 *
 * Shows the game title. New runs go through class select. Existing saves
 * can continue directly to hub.
 */

import { createInput } from '../engine/input.js';
import { hydratePlayerFromSave } from '../engine/player.js';

let sm = null;
let save = null;
let classes = null;
let abilities = null;
export function setTitleStateMachine(s) { sm = s; }
export function configureTitleScene({ saveManager, classesRegistry, abilitiesRegistry }) {
  save = saveManager;
  classes = classesRegistry;
  abilities = abilitiesRegistry || null;
}

export const titleScene = {
  name: 'title',
  enter() {
    console.log('[scene] enter: title');
    this._input = createInput(globalThis);
    this._t = 0;
    this._saveData = null;
    this._saveReady = !save;
    if (save) {
      save.load()
        .then((data) => {
          this._saveData = data;
          this._saveReady = true;
        })
        .catch(() => {
          this._saveData = null;
          this._saveReady = true;
        });
    }
  },
  exit() {
    console.log('[scene] exit: title');
    this._input = null;
  },
  update(dt) {
    this._t += dt;
    if (!this._input || !this._saveReady) return;

    const newRunPressed = this._input.wasJustPressed('jump');
    const continuePressed = this._input.wasJustPressed('interact');

    if (this._saveData && continuePressed) {
      if (sm) sm.transition('hub', { player: hydratePlayerFromSave(this._saveData) });
      return;
    }

    if (newRunPressed || (!this._saveData && continuePressed)) {
      if (sm) sm.transition('class-select', { classes, abilities, save });
    }
  },
  render(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.fillStyle = '#0f0f1f';
    ctx.fillRect(0, 0, w, h);
    // Title
    ctx.fillStyle = '#f4c089';
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PrinceFarmer', w / 2, h / 2 - 40);
    // Subtitle
    ctx.fillStyle = '#a0a0c0';
    ctx.font = '20px monospace';
    ctx.fillText('A side-scrolling Filipino adventure', w / 2, h / 2);
    // Start prompt (blinks)
    if (Math.floor(this._t * 2) % 2 === 0) {
      ctx.fillStyle = '#f0f0f0';
      ctx.font = '24px monospace';
      if (!this._saveReady) {
        ctx.fillText('Loading save...', w / 2, h / 2 + 80);
      } else if (this._saveData) {
        ctx.fillText('Enter to continue  |  Space for new run', w / 2, h / 2 + 80);
      } else {
        ctx.fillText('Press SPACE or Enter to start', w / 2, h / 2 + 80);
      }
    }
  },
};
