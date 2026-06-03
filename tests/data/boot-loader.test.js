import { describe, it, expect } from 'vitest';
import { loadRooms, loadDungeons } from '../../src/engine/gamedb.js';

describe('loadRooms', () => {
  it('returns a GameDB containing the stub room', () => {
    const db = loadRooms();
    const room = db.get('01-stub-sandbox');
    expect(room).not.toBeNull();
    expect(room.type).toBe('platforming');
  });
});

describe('loadDungeons', () => {
  it('returns a GameDB containing the stub dungeon', () => {
    const db = loadDungeons();
    const dungeon = db.get('01-stub-sandbox');
    expect(dungeon).not.toBeNull();
    expect(dungeon.rooms).toContain('01-stub-sandbox');
  });
});
