import { describe, it, expect } from 'vitest';
import { createXpGem, tickXpGem } from '../../src/engine/pickup.js';

describe('createXpGem', () => {
  it('initializes a gem with the given position, amount, and alive flag', () => {
    const g = createXpGem(3, 4, 5);
    expect(g.kind).toBe('xp');
    expect(g.x).toBe(3);
    expect(g.y).toBe(4);
    expect(g.amount).toBe(5);
    expect(g.alive).toBe(true);
    expect(typeof g.update).toBe('function');
    expect(typeof g.render).toBe('function');
  });
});

describe('tickXpGem', () => {
  it('gem outside the pickup radius is unaffected by player', () => {
    const g = createXpGem(0, 0, 5);
    const player = { x: 10, y: 0, xp: 0, level: 1, pendingLevelUp: false };
    tickXpGem(g, 0.1, player);
    expect(g.x).toBeCloseTo(0, 5);
    expect(g.alive).toBe(true);
  });

  it('gem inside the pickup radius accelerates toward the player', () => {
    const g = createXpGem(0, 0, 5);
    const player = { x: 2, y: 0, xp: 0, level: 1, pendingLevelUp: false };
    tickXpGem(g, 0.1, player);
    // Gem should have moved toward the player
    expect(g.x).toBeGreaterThan(0);
    expect(g.alive).toBe(true);
  });

  it('on contact (dist < 0.3): grants XP, removes gem (alive=false)', () => {
    const g = createXpGem(0, 0, 5);
    const player = { x: 0.1, y: 0.1, xp: 0, level: 1, pendingLevelUp: false };
    tickXpGem(g, 0.1, player);
    expect(player.xp).toBe(5);
    expect(g.alive).toBe(false);
  });

  it('level-up cascade fires when XP crosses threshold', () => {
    const g = createXpGem(0, 0, 10); // exactly level-1 threshold
    const player = { x: 0.1, y: 0.1, xp: 0, level: 1, pendingLevelUp: false };
    tickXpGem(g, 0.1, player);
    expect(player.level).toBe(2);
    expect(player.pendingLevelUp).toBe(true);
  });
});
