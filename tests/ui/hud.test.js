import { describe, it, expect, vi } from 'vitest';
import { drawHud } from '../../src/ui/hud.js';

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
