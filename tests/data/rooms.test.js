import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

function readJson(relPath) {
  return JSON.parse(readFileSync(join(root, relPath), 'utf8'));
}

describe('stub sandbox data', () => {
  const room = readJson('data/rooms/01-stub-sandbox.json');
  const dungeon = readJson('data/dungeons/01-stub-sandbox.json');

  it('room has required fields', () => {
    expect(room.id).toBe('01-stub-sandbox');
    expect(room.type).toBe('platforming');
    expect(Array.isArray(room.tiles)).toBe(true);
    expect(room.tiles.length).toBeGreaterThan(0);
    expect(room.spawn).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  });

  it('room tiles are consistent (all rows same width)', () => {
    const width = room.tiles[0].length;
    for (const row of room.tiles) {
      expect(row.length).toBe(width);
    }
  });

  it('dungeon references the room', () => {
    expect(dungeon.id).toBe('01-stub-sandbox');
    expect(dungeon.rooms).toContain('01-stub-sandbox');
  });

  it('dungeon has a theme and monster pool (empty for stub)', () => {
    expect(typeof dungeon.theme).toBe('string');
    expect(Array.isArray(dungeon.monsterPool)).toBe(true);
  });
});
