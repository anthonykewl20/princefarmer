import { describe, it, expect } from 'vitest';
import { resolveShape, applyHit } from '../../src/engine/combat.js';

describe('resolveShape', () => {
  const player = { x: 0, y: 0, facing: 1 }; // facing right (+x)

  it('arc: target in front of attacker within radius hits', () => {
    const target = { x: 1, y: 0.1 };
    expect(resolveShape(player, target, { shape: 'arc', arc: Math.PI / 2, radius: 1.2 })).toBe(true);
  });

  it('arc: target behind attacker misses', () => {
    const target = { x: -1, y: 0.1 };
    expect(resolveShape(player, target, { shape: 'arc', arc: Math.PI / 2, radius: 1.2 })).toBe(false);
  });

  it('arc: target outside radius misses', () => {
    const target = { x: 5, y: 0.1 };
    expect(resolveShape(player, target, { shape: 'arc', arc: Math.PI / 2, radius: 1.2 })).toBe(false);
  });

  it('circle: hits in any direction within radius', () => {
    expect(resolveShape(player, { x: -1, y: 0 }, { shape: 'circle', radius: 1.5 })).toBe(true);
    expect(resolveShape(player, { x: 0, y: 1 }, { shape: 'circle', radius: 1.5 })).toBe(true);
  });

  it('circle: misses outside radius', () => {
    expect(resolveShape(player, { x: 5, y: 0 }, { shape: 'circle', radius: 1.5 })).toBe(false);
  });

  it('line: target on the line within range hits', () => {
    const target = { x: 1, y: 0.05 };
    expect(resolveShape(player, target, { shape: 'line', range: 2.0, thickness: 0.1 })).toBe(true);
  });

  it('line: target far from line misses', () => {
    const target = { x: 1, y: 1.0 };
    expect(resolveShape(player, target, { shape: 'line', range: 2.0, thickness: 0.1 })).toBe(false);
  });

  it('line: target beyond horizontal range misses even if close in y', () => {
    // Euclidean distance 1.41 < range 2.0, but horizontal distance 1.5 = 1.5
    // is at the boundary, so dx=2 should miss with range 1.0.
    const target = { x: 2, y: 0.05 };
    expect(resolveShape(player, target, { shape: 'line', range: 1.0, thickness: 0.1 })).toBe(false);
  });

  it('cone: returns the same result as arc with the same parameters', () => {
    const shape = { shape: 'cone', arc: Math.PI / 2, radius: 1.2 };
    const arcShape = { shape: 'arc', arc: Math.PI / 2, radius: 1.2 };
    const positions = [
      { x: 1, y: 0.1 },   // in front, in arc
      { x: -1, y: 0.1 },  // behind, out of arc
      { x: 5, y: 0.1 },   // in front, outside radius
      { x: 0.5, y: 0.5 }, // diagonal in arc
    ];
    for (const target of positions) {
      expect(resolveShape(player, target, shape)).toBe(
        resolveShape(player, target, arcShape)
      );
    }
  });

  it('arc: attacker facing -1 (left) hits target on the left', () => {
    const leftAttacker = { x: 0, y: 0, facing: -1 };
    const target = { x: -1, y: 0.1 };
    expect(resolveShape(leftAttacker, target, { shape: 'arc', arc: Math.PI / 2, radius: 1.2 })).toBe(true);
  });

  it('arc: attacker facing -1 (left) misses target on the right', () => {
    const leftAttacker = { x: 0, y: 0, facing: -1 };
    const target = { x: 1, y: 0.1 };
    expect(resolveShape(leftAttacker, target, { shape: 'arc', arc: Math.PI / 2, radius: 1.2 })).toBe(false);
  });
});

describe('applyHit', () => {
  it('deals base damage on a non-crit, marks the hit, returns result', () => {
    const target = { hp: 30, maxHp: 30, isDead: false };
    const attacker = { attackPower: 1 };
    const rng = () => 0.5; // non-crit
    const result = applyHit(target, 20, attacker, rng);
    expect(result.damage).toBe(20);
    expect(result.crit).toBe(false);
    expect(target.hp).toBe(10);
  });

  it('deals 1.5x on a crit and reports crit: true', () => {
    const target = { hp: 30, maxHp: 30, isDead: false };
    const attacker = { attackPower: 1 };
    const rng = () => 0.05; // crit
    const result = applyHit(target, 20, attacker, rng);
    expect(result.damage).toBe(30);
    expect(result.crit).toBe(true);
    expect(target.hp).toBe(0);
    expect(target.isDead).toBe(true);
  });

  it('clamps target HP to 0 (does not go negative)', () => {
    const target = { hp: 5, maxHp: 100, isDead: false };
    const rng = () => 0.5;
    applyHit(target, 20, { attackPower: 1 }, rng);
    expect(target.hp).toBe(0);
    expect(target.isDead).toBe(true);
  });

  it('honors attacker.attackPower=2 by boosting damage by 10% on a non-crit', () => {
    const target = { hp: 100, maxHp: 100, isDead: false };
    const attacker = { attackPower: 2 };
    const rng = () => 0.5; // non-crit
    const result = applyHit(target, 20, attacker, rng);
    // 20 * 1.1 = 22, floor = 22
    expect(result.damage).toBe(22);
    expect(result.crit).toBe(false);
    expect(target.hp).toBe(78);
  });

  it('honors attacker.attackPower=2 on a crit (1.1x then 1.5x, floored)', () => {
    const target = { hp: 100, maxHp: 100, isDead: false };
    const attacker = { attackPower: 2 };
    const rng = () => 0.05; // crit
    const result = applyHit(target, 20, attacker, rng);
    // floor(20 * 1.1 * 1.5) = floor(33) = 33
    expect(result.damage).toBe(33);
    expect(result.crit).toBe(true);
    expect(target.hp).toBe(67);
  });

  it('attackPower=1 leaves base damage unchanged (no modifier)', () => {
    const target = { hp: 100, maxHp: 100, isDead: false };
    const attacker = { attackPower: 1 };
    const rng = () => 0.5;
    const result = applyHit(target, 20, attacker, rng);
    expect(result.damage).toBe(20);
    expect(target.hp).toBe(80);
  });
});
