import { describe, it, expect } from 'vitest';
import { strafeLunge } from '../../src/engine/behaviors/strafe-lunge.js';
import { createMonster } from '../../src/engine/monster.js';

const ASWANG = {
  id: 'aswang', hp: 30, damage: 8, speed: 1.5,
  contactRange: 0.6, behavior: 'strafe-lunge', drops: [],
};

describe('strafeLunge behavior', () => {
  it('walks toward the player when far (>3u)', () => {
    const m = createMonster(ASWANG, 0, 0);
    strafeLunge(m, 0.1, { player: { x: 10, y: 0 } });
    expect(m.action).toBe('strafe');
    expect(m.vx).toBeGreaterThan(0);
    expect(m.vy).toBeCloseTo(0, 5);
    expect(m.facing).toBe(1);
  });

  it('strafes perpendicular when at mid-range (1.5u < dist <= 3u)', () => {
    const m = createMonster(ASWANG, 0, 0);
    strafeLunge(m, 0.1, { player: { x: 2, y: 0 } });
    expect(m.action).toBe('strafe');
    // Perpendicular to (2,0) is (0, ±1) → vy non-zero
    expect(Math.abs(m.vy)).toBeGreaterThan(0);
  });

  it('lunges when in range and cooldown is ready', () => {
    const m = createMonster(ASWANG, 0, 0);
    strafeLunge(m, 0.1, { player: { x: 1, y: 0 } });
    expect(m.action).toBe('lunge');
    expect(m.lungeTimer).toBeCloseTo(1.5, 5);
    expect(m.vx).toBeGreaterThan(0);
  });

  it('idles when in range but cooldown is active', () => {
    const m = createMonster(ASWANG, 0, 0);
    m.lungeTimer = 1.0; // mid-cooldown
    strafeLunge(m, 0.1, { player: { x: 1, y: 0 } });
    expect(m.action).toBe('idle');
    expect(m.vx).toBe(0);
    expect(m.vy).toBe(0);
  });

  it('decrements lungeTimer each tick', () => {
    const m = createMonster(ASWANG, 0, 0);
    m.lungeTimer = 0.5;
    strafeLunge(m, 0.1, { player: { x: 10, y: 0 } });
    expect(m.lungeTimer).toBeCloseTo(0.4, 5);
  });
});
