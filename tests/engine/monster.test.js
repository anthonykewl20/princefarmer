import { describe, it, expect } from 'vitest';
import { createMonster, tickMonster } from '../../src/engine/monster.js';

const ASWANG = {
  id: 'aswang',
  hp: 30,
  damage: 8,
  speed: 1.5,
  contactRange: 0.6,
  behavior: 'strafe-lunge',
  drops: [{ kind: 'xp', amount: 5, chance: 1.0 }],
};

describe('createMonster', () => {
  it('initializes all fields from the template', () => {
    const m = createMonster(ASWANG, 5, 5);
    expect(m.id).toBe('aswang');
    expect(m.hp).toBe(30);
    expect(m.maxHp).toBe(30);
    expect(m.damage).toBe(8);
    expect(m.speed).toBe(1.5);
    expect(m.contactRange).toBe(0.6);
    expect(m.x).toBe(5);
    expect(m.y).toBe(5);
    expect(m.action).toBe('idle');
    expect(m.strafeSign).toBe(1);
    expect(m.lungeTimer).toBe(0);
    expect(m.template).toBe(ASWANG);
    expect(typeof m.update).toBe('function');
    expect(typeof m.render).toBe('function');
  });
});

describe('tickMonster', () => {
  it('looks up the behavior in BEHAVIORS and invokes it; integrates motion', () => {
    const m = createMonster(ASWANG, 0, 0);
    const world = { player: { x: 10, y: 0 } };
    tickMonster(m, 0.1, world);
    // After tick: monster should have moved toward the player
    expect(m.x).toBeGreaterThan(0);
    expect(m.action).toBe('strafe'); // far away → walk
  });

  it('decrements lungeTimer', () => {
    const m = createMonster(ASWANG, 0, 0);
    m.lungeTimer = 1.0;
    tickMonster(m, 0.5, { player: { x: 10, y: 0 } });
    expect(m.lungeTimer).toBeCloseTo(0.5, 5);
  });
});
