import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hubScene, setHubStateMachine, setEnterDungeon } from '../../src/scenes/hub.js';

function makeInput() {
  return {
    isPressed: () => false,
    wasJustPressed: () => false,
    endFrame: () => {},
  };
}

describe('hub scene', () => {
  beforeEach(() => {
    hubScene.exit();
    // enter() initializes _playerX, _playerY, and _input. We need
    // enter() to wire up a real input handler, but the tests below
    // override _input to drive the controls manually.
    hubScene.enter();
    hubScene._input = makeInput();
  });

  describe('update — vertical controls (regression: inverted)', () => {
    it('pressing up decreases _playerY (moves player up on screen)', () => {
      hubScene._input = { ...makeInput(), isPressed: (a) => a === 'up' };
      const startY = hubScene._playerY;
      hubScene.update(0.5);
      expect(hubScene._playerY).toBeLessThan(startY);
    });

    it('pressing down increases _playerY (moves player down on screen)', () => {
      hubScene._input = { ...makeInput(), isPressed: (a) => a === 'down' };
      const startY = hubScene._playerY;
      hubScene.update(0.5);
      expect(hubScene._playerY).toBeGreaterThan(startY);
    });
  });

  describe('render — world-units scale (regression: pixel-space without scaling)', () => {
    it('scales the canvas context by 64 around world-space draws', () => {
      const calls = [];
      const ctx = {
        canvas: { width: 1024, height: 768 },
        save: vi.fn(() => calls.push('save')),
        restore: vi.fn(() => calls.push('restore')),
        scale: vi.fn(() => calls.push('scale')),
        fillStyle: '',
        fillRect: vi.fn(),
        font: '',
        textAlign: '',
        fillText: vi.fn(),
      };
      // Place the player far from the entrance so the prompt is NOT drawn
      // (we only care about the scale+save+restore for this test)
      hubScene._playerX = 100;
      hubScene._playerY = 100;
      hubScene.render(ctx);

      const saveIdx = calls.indexOf('save');
      const scaleIdx = calls.indexOf('scale');
      const restoreIdx = calls.indexOf('restore');
      expect(saveIdx).toBeGreaterThanOrEqual(0);
      expect(scaleIdx).toBeGreaterThan(saveIdx);
      expect(restoreIdx).toBeGreaterThan(scaleIdx);
      expect(ctx.scale).toHaveBeenCalledWith(64, 64);
    });
  });

  describe('interact at entrance', () => {
    it('transitions to the dungeon when the player is near the entrance and presses E', () => {
      const enterDungeon = vi.fn();
      setEnterDungeon(enterDungeon);
      setHubStateMachine({});
      hubScene._playerX = 5; // ENTRANCE_X
      hubScene._playerY = 1; // ENTRANCE_Y
      hubScene._input = { ...makeInput(), wasJustPressed: (a) => a === 'interact' };
      hubScene.update(0.016);
      expect(enterDungeon).toHaveBeenCalledWith('01-stub-sandbox');
    });
  });
});
