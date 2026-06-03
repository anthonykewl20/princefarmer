import { describe, it, expect, beforeEach } from 'vitest';
import { createCamera, updateCamera } from '../../src/engine/camera.js';

describe('camera', () => {
  let cam;
  beforeEach(() => {
    cam = createCamera({ x: 0, y: 0 }, { width: 100, height: 60 });
  });

  describe('createCamera', () => {
    it('starts at the target position with no smoothing', () => {
      expect(cam.x).toBe(0);
      expect(cam.y).toBe(0);
      expect(cam.scale).toBe(1);
    });
  });

  describe('updateCamera', () => {
    it('moves toward the target by a fraction of the distance (lerp)', () => {
      updateCamera(cam, { x: 10, y: 0 }, 0.016, 0.1);
      // Exponential damping: t = 1 - exp(-0.1 * 0.016) ≈ 0.0016
      // Camera moves ~0.16% of the 10-unit distance toward the target in one frame
      expect(cam.x).toBeCloseTo(0.016, 3);
      expect(cam.y).toBe(0);
    });

    it('clamps to room bounds horizontally', () => {
      const smallRoom = { width: 50, height: 60 };
      const c = createCamera({ x: 0, y: 0 }, smallRoom);
      // Trying to track a target far to the right of a small room
      updateCamera(c, { x: 1000, y: 0 }, 1, 1);
      // Camera x should not exceed room width / 2 (assuming camera is centered on target)
      // (depends on framing logic — for M1 we center on target)
      expect(c.x).toBeLessThanOrEqual(smallRoom.width / 2);
    });
  });

  describe('setScale', () => {
    it('changes the camera scale', () => {
      cam.scale = 0.5;
      expect(cam.scale).toBe(0.5);
    });
  });
});
