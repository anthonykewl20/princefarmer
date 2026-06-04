import { describe, it, expect, vi } from 'vitest';
import { drawHud, drawCombatHud } from '../../src/ui/hud.js';

describe('drawHud', () => {
  it('draws the HP bar background and foreground at the right ratio', () => {
    const ctx = {
      fillStyle: '',
      fillRect: vi.fn(),
    };
    const p = { hp: 50, maxHp: 100 };
    drawHud(ctx, p, 200, 20, 10, 10);
    // 4 fillRects: bg bar, hp bar, hp text area, maybe outline
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(2);
    // The HP bar should be ~half the width of the background
    const calls = ctx.fillRect.mock.calls;
    // bg fillRect uses width=200; HP fillRect uses Math.floor(200 * 0.5) = 100
    const widths = calls.map((c) => c[2]).sort((a, b) => a - b);
    expect(widths).toContain(100);
    expect(widths).toContain(200);
  });
});

describe('drawCombatHud', () => {
  it('draws HP bar, XP bar, ability icon, and level/zone label', () => {
    const ctx = {
      canvas: { width: 800, height: 600 },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
    };
    const p = { hp: 80, maxHp: 100, xp: 0, level: 3 };
    const room = { id: '01-stub-sandbox' };
    const weapon = { abilities: ['lunging-strike'] };
    drawCombatHud(ctx, p, room, weapon);
    // HP bar bg + HP fill = 2 fillRects just for HP
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(3);
    // Level text drawn
    expect(ctx.fillText).toHaveBeenCalled();
    // Zone/room label
    const labels = ctx.fillText.mock.calls.map((c) => c[0]);
    expect(labels.some((l) => typeof l === 'string' && l.includes('01-stub-sandbox'))).toBe(true);
  });
});
