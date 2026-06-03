import { describe, it, expect, vi, beforeEach } from 'vitest';
import { levelupScene } from '../../src/scenes/levelup.js';

describe('levelup scene', () => {
  beforeEach(() => { levelupScene.exit(); });

  it('enter() stores the timer, dungeonId, and player', () => {
    const p = { level: 1, maxHp: 100, hp: 100, attackPower: 1 };
    levelupScene.enter({ dungeonId: 'd1', player: p });
    expect(levelupScene._timer).toBe(0);
    expect(levelupScene._dungeonId).toBe('d1');
    expect(levelupScene._player).toBe(p);
  });

  it('update() ticks timer; transitions to dungeon at 1.0s', () => {
    const p = { level: 1, maxHp: 100, hp: 100, attackPower: 1 };
    const sm = { transition: vi.fn() };
    levelupScene._stateMachine = sm;
    levelupScene.enter({ dungeonId: 'd1', player: p });
    levelupScene.update(0.5);
    expect(sm.transition).not.toHaveBeenCalled();
    levelupScene.update(0.6); // total 1.1s
    expect(sm.transition).toHaveBeenCalledWith('dungeon', { dungeonId: 'd1', player: p });
  });

  it('exit() applies rewards, clears pendingLevelUp, saves', () => {
    const p = { level: 1, maxHp: 100, hp: 50, attackPower: 1, pendingLevelUp: true };
    levelupScene._player = p;
    // Stub the SaveManager import (we don't have a save here)
    vi.mock('../../src/persistence/save.js', () => ({ SaveManager: { save: vi.fn() } }));
    levelupScene.exit();
    expect(p.level).toBe(2);
    expect(p.maxHp).toBe(105);
    expect(p.hp).toBe(105);
    expect(p.attackPower).toBe(2);
    expect(p.pendingLevelUp).toBe(false);
  });
});
