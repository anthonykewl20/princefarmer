import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deathScene } from '../../src/scenes/death.js';

describe('death scene', () => {
  beforeEach(() => { deathScene.exit(); });

  it('enter() stores the timer and returnTo target', () => {
    deathScene.enter({ dungeonId: 'd1', returnTo: 'hub' });
    expect(deathScene._timer).toBe(0);
    expect(deathScene._returnTo).toBe('hub');
    expect(deathScene._dungeonId).toBe('d1');
  });

  it('update() ticks the timer; transitions at 1.5s', () => {
    const sm = { transition: vi.fn() };
    deathScene._stateMachine = sm;
    deathScene.enter({ dungeonId: 'd1', returnTo: 'hub' });
    deathScene.update(1.0);
    expect(sm.transition).not.toHaveBeenCalled();
    deathScene.update(0.6); // total 1.6s
    expect(sm.transition).toHaveBeenCalledWith('hub', { dungeonId: 'd1', player: null });
  });

  it('render() draws "YOU DIED" overlay', () => {
    const ctx = {
      canvas: { width: 800, height: 600 },
      fillStyle: '',
      fillRect: vi.fn(),
      font: '',
      textAlign: '',
      fillText: vi.fn(),
    };
    deathScene.render(ctx);
    expect(ctx.fillText).toHaveBeenCalledWith('YOU DIED', 400, 300);
  });
});
