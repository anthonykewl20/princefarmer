import { createInput } from '../engine/input.js';
import { applyClassTemplate } from '../engine/classes.js';
import { createPlayer, serializePlayerToSave } from '../engine/player.js';
import { SaveManager } from '../persistence/save.js';

function getClassList(registry) {
  if (!registry) return [];
  if (typeof registry.idsWhere === 'function') {
    return registry.idsWhere(() => true).map((id) => registry.get(id)).filter(Boolean);
  }
  if (typeof registry.values === 'function') return Array.from(registry.values());
  return [];
}

function persistSave(save, payload) {
  if (save && typeof save.write === 'function') return save.write(payload);
  return SaveManager.save(payload);
}

export const classSelectScene = {
  name: 'class-select',

  enter(ctx = {}) {
    console.log('[scene] enter: class-select');
    this._input = createInput(globalThis);
    this._save = ctx.save ?? null;
    this._classes = getClassList(ctx.classes);
    this._selectedIndex = 0;
  },

  exit() {
    this._input = null;
    this._save = null;
    this._classes = [];
    this._selectedIndex = 0;
  },

  update() {
    if (!this._input || this._classes.length === 0) return;

    if (this._input.wasJustPressed('escape')) {
      this._stateMachine?.transition('title');
      return;
    }
    if (this._input.wasJustPressed('left')) {
      this._selectedIndex = (this._selectedIndex + this._classes.length - 1) % this._classes.length;
      return;
    }
    if (this._input.wasJustPressed('right')) {
      this._selectedIndex = (this._selectedIndex + 1) % this._classes.length;
      return;
    }
    if (this._input.wasJustPressed('interact') || this._input.wasJustPressed('jump')) {
      const selected = this._classes[this._selectedIndex];
      const player = createPlayer(0, 0, null);
      applyClassTemplate(player, selected);
      persistSave(this._save, serializePlayerToSave(player)).catch(() => {});
      this._stateMachine?.transition('hub', { player });
    }
  },

  render(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const selected = this._classes[this._selectedIndex] ?? null;
    ctx.fillStyle = '#10161b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4c089';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Choose Class', w / 2, 90);

    if (!selected) return;

    ctx.fillStyle = '#f0f0f0';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(selected.name, w / 2, 170);

    ctx.fillStyle = '#b8c2cc';
    ctx.font = '20px monospace';
    ctx.fillText(selected.description, w / 2, 220);
    ctx.fillText(`Main: ${selected.starterLoadout.main.weaponId}`, w / 2, 300);
    ctx.fillText(`Offhand: ${selected.starterLoadout.offhand.weaponId}`, w / 2, 335);
    ctx.fillText(`Signature: ${selected.signatureAbilityId}`, w / 2, 370);
    ctx.fillText(`Class ${this._selectedIndex + 1}/${this._classes.length}`, w / 2, h - 90);
    ctx.fillText('Arrows to change, Enter to confirm', w / 2, h - 50);
  },
};
