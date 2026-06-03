import { describe, it, expect } from 'vitest';
import { applyLevelUpRewards } from '../../src/engine/levelup.js';

describe('applyLevelUpRewards', () => {
  it('increments level, maxHp, attackPower; restores HP to full', () => {
    const player = { level: 1, maxHp: 100, hp: 30, attackPower: 1 };
    applyLevelUpRewards(player);
    expect(player.level).toBe(2);
    expect(player.maxHp).toBe(105);
    expect(player.hp).toBe(105);
    expect(player.attackPower).toBe(2);
  });

  it('stacks: a 2nd call from level 2 → level 3', () => {
    const player = { level: 2, maxHp: 105, hp: 50, attackPower: 2 };
    applyLevelUpRewards(player);
    expect(player.level).toBe(3);
    expect(player.maxHp).toBe(110);
    expect(player.hp).toBe(110);
    expect(player.attackPower).toBe(3);
  });
});
