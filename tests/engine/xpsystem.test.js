import { describe, it, expect } from 'vitest';
import { xpForLevel, grantXp } from '../../src/engine/xpsystem.js';

describe('xpForLevel', () => {
  it('returns 10 for level 1', () => {
    expect(xpForLevel(1)).toBe(10);
  });

  it('returns 15 for level 2, 20 for level 3, etc.', () => {
    expect(xpForLevel(2)).toBe(15);
    expect(xpForLevel(3)).toBe(20);
    expect(xpForLevel(4)).toBe(25);
  });
});

describe('grantXp', () => {
  it('adds XP and triggers a level-up when threshold is crossed', () => {
    const player = { level: 1, xp: 0, pendingLevelUp: false };
    grantXp(player, 5);
    expect(player.xp).toBe(5);
    expect(player.level).toBe(1);
    grantXp(player, 5);
    expect(player.xp).toBe(0);
    expect(player.level).toBe(2);
    expect(player.pendingLevelUp).toBe(true);
  });

  it('cascades multiple level-ups from one big grant', () => {
    // L1→L2 needs 10, L2→L3 needs 15, L3→L4 needs 20 — total 45
    const player = { level: 1, xp: 0, pendingLevelUp: false };
    grantXp(player, 45);
    expect(player.level).toBe(4);
    expect(player.xp).toBe(0);
    expect(player.pendingLevelUp).toBe(true);
  });

  it('resets pendingLevelUp to false on each call (one flash per call)', () => {
    const player = { level: 1, xp: 0, pendingLevelUp: false };
    grantXp(player, 100);
    expect(player.pendingLevelUp).toBe(true);
    player.pendingLevelUp = false; // simulate the scene consuming it
    grantXp(player, 5); // sub-threshold — no level-up
    expect(player.pendingLevelUp).toBe(false);
  });
});
