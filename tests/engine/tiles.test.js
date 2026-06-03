import { describe, it, expect } from 'vitest';
import { createTileGrid, getTile, TILE_EMPTY, TILE_SOLID, TILE_LADDER, isSolid, isLadder, TILE_SIZE } from '../../src/engine/tiles.js';

describe('tiles', () => {
  describe('constants', () => {
    it('exports tile type constants', () => {
      expect(TILE_EMPTY).toBe('.');
      expect(TILE_SOLID).toBe('#');
      expect(TILE_LADDER).toBe('L');
    });
    it('exports a TILE_SIZE constant (default 1 world unit per tile)', () => {
      expect(TILE_SIZE).toBeGreaterThan(0);
    });
  });

  describe('createTileGrid', () => {
    it('creates a grid from a 2D string array', () => {
      const grid = createTileGrid([
        '###',
        '#.#',
        '###',
      ]);
      expect(grid.width).toBe(3);
      expect(grid.height).toBe(3);
      expect(getTile(grid, 0, 0)).toBe('#');
      expect(getTile(grid, 1, 1)).toBe('.');
      expect(getTile(grid, 2, 0)).toBe('#');
    });

    it('throws if rows have inconsistent widths', () => {
      expect(() => createTileGrid(['##', '#.#'])).toThrow(/inconsistent/);
    });
  });

  describe('getTile', () => {
    it('returns TILE_EMPTY for out-of-bounds coordinates', () => {
      const grid = createTileGrid(['##']);
      expect(getTile(grid, -1, 0)).toBe('.');
      expect(getTile(grid, 0, -1)).toBe('.');
      expect(getTile(grid, 5, 0)).toBe('.');
    });
  });

  describe('isSolid / isLadder', () => {
    it('isSolid returns true only for TILE_SOLID', () => {
      expect(isSolid('#')).toBe(true);
      expect(isSolid('.')).toBe(false);
      expect(isSolid('L')).toBe(false);
    });
    it('isLadder returns true only for TILE_LADDER', () => {
      expect(isLadder('L')).toBe(true);
      expect(isLadder('#')).toBe(false);
      expect(isLadder('.')).toBe(false);
    });
  });
});
