import { describe, it, expect } from 'vitest';
import { createBody, applyGravity, integrate, applyFriction, isOnGround } from '../../src/engine/physics.js';

describe('physics', () => {
  describe('createBody', () => {
    it('returns a body with default position, velocity, and onGround=true', () => {
      const b = createBody(10, 20);
      expect(b).toEqual({
        x: 10, y: 20,
        vx: 0, vy: 0,
        onGround: true,
        onLadder: false,
        onLedge: false,
        facing: 1,
      });
    });
  });

  describe('applyGravity', () => {
    it('adds gravity to vy each call', () => {
      const b = createBody(0, 0);
      applyGravity(b, 30, 0.1);
      expect(b.vy).toBeCloseTo(3);
      applyGravity(b, 30, 0.1);
      expect(b.vy).toBeCloseTo(6);
    });

    it('uses a sensible default gravity when dt is omitted', () => {
      const b = createBody(0, 0);
      applyGravity(b, 30);
      // assumes dt = 1/60 default
      expect(b.vy).toBeCloseTo(0.5);
    });
  });

  describe('integrate', () => {
    it('moves the body by velocity * dt', () => {
      const b = createBody(0, 0, { vx: 10, vy: 0 });
      integrate(b, 0.5);
      expect(b.x).toBe(5);
      expect(b.y).toBe(0);
    });
  });

  describe('applyFriction', () => {
    it('reduces vx by friction * dt, clamped to zero', () => {
      const b = createBody(0, 0, { vx: 10 });
      applyFriction(b, 6, 0.5);
      expect(b.vx).toBe(7);
    });

    it('clamps vx to zero when friction would overshoot', () => {
      const b = createBody(0, 0, { vx: 1 });
      applyFriction(b, 6, 1);
      expect(b.vx).toBe(0);
    });

    it('does nothing when vx is already zero', () => {
      const b = createBody(0, 0);
      applyFriction(b, 6, 0.1);
      expect(b.vx).toBe(0);
    });

    it('does nothing when body is on the ground is false... wait, applies to airborne too', () => {
      const b = createBody(0, 0, { vx: 4 });
      b.onGround = false;
      applyFriction(b, 6, 0.1);
      // friction applies to airborne bodies too (air resistance is small)
      // — this test just confirms it does NOT crash
      expect(b.vx).toBeCloseTo(3.4);
    });
  });

  describe('isOnGround', () => {
    it('returns the onGround flag', () => {
      const b = createBody(0, 0);
      expect(isOnGround(b)).toBe(true);
      b.onGround = false;
      expect(isOnGround(b)).toBe(false);
    });
  });
});
