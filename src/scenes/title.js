/**
 * Title scene.
 *
 * Shows the game title and a "Press SPACE to start" prompt.
 * Pressing Space or Enter transitions to the hub.
 */

import { createInput } from '../engine/input.js';

let sm = null;
export function setTitleStateMachine(s) { sm = s; }

export const titleScene = {
  name: 'title',
  enter() {
    console.log('[scene] enter: title');
    this._input = createInput(globalThis);
    this._t = 0;
  },
  exit() {
    console.log('[scene] exit: title');
    this._input = null;
  },
  update(dt) {
    this._t += dt;
    if (this._input && (this._input.wasJustPressed('jump') || this._input.wasJustPressed('interact'))) {
      if (sm) sm.transition('hub');
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
      ctx.fillText('Press SPACE to start', w / 2, h / 2 + 80);
    }
  },
};
