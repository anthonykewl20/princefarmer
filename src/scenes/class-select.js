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
    this._abilities = ctx.abilities || new Map();
    this._selectedIndex = 0;
  },

  exit() {
    this._input = null;
    this._save = null;
    this._classes = [];
    this._abilities = new Map();
    this._selectedIndex = 0;
  },

  _getAbility(abilityId) {
    return this._abilities.get(abilityId) || null;
  },

  _drawTextBlock(ctx, text, x, y, maxWidth, lineHeight = 22) {
    const words = text.split(' ');
    let line = '';
    let lineY = y;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      const width = ctx.measureText(candidate).width;
      if (width > maxWidth && line) {
        ctx.fillText(line, x, lineY);
        line = word;
        lineY += lineHeight;
      } else {
        line = candidate;
      }
    }
    if (line) {
      ctx.fillText(line, x, lineY);
      lineY += lineHeight;
    }

    ctx.textAlign = prevAlign;

    return lineY;
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
    if (this._input.wasJustPressed('up')) {
      this._selectedIndex = (this._selectedIndex + this._classes.length - 1) % this._classes.length;
      return;
    }
    if (this._input.wasJustPressed('down')) {
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
    const accent = selected.accent ?? '#f4c089';
    ctx.fillStyle = accent;
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Choose Class', w / 2, 90);

    if (!selected) return;

    ctx.fillStyle = '#f0f0f0';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(selected.name, w / 2, 170);

    ctx.fillStyle = '#b8c2cc';
    ctx.font = '20px monospace';
    const ability = this._getAbility(selected.signatureAbilityId);
    const signatureName = ability?.name ?? selected.signatureAbilityId;

    const lastY = this._drawTextBlock(ctx, selected.blurb || selected.description, w / 2 - 320, 220, 640, 22);
    ctx.textAlign = 'center';
    ctx.fillText(`Main: ${selected.starterLoadout.main.weaponId}`, w / 2, Math.max(300, lastY + 20));
    ctx.fillText(`Offhand: ${selected.starterLoadout.offhand.weaponId}`, w / 2, Math.max(330, lastY + 44));
    ctx.fillText(`Signature: ${signatureName} (${selected.signatureAbilityId})`, w / 2, Math.max(360, lastY + 68));
    if (ability?.cooldown != null) {
      ctx.fillText(`Cooldown: ${ability.cooldown.toFixed(1)}s`, w / 2, Math.max(390, lastY + 92));
    }
    ctx.fillText(`Class ${this._selectedIndex + 1}/${this._classes.length}`, w / 2, h - 90);
    ctx.fillText('Arrows to change, Enter to confirm', w / 2, h - 50);
  },
};
