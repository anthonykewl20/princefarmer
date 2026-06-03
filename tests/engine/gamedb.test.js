import { describe, it, expect, beforeEach } from 'vitest';
import { GameDB } from '../../src/engine/gamedb.js';

describe('GameDB', () => {
  let db;
  beforeEach(() => { db = new GameDB(); });

  it('registers and retrieves by id', () => {
    db.register('sword', { id: 'sword', name: 'Kampilan' });
    expect(db.get('sword')).toEqual({ id: 'sword', name: 'Kampilan' });
  });

  it('returns null for unknown id', () => {
    expect(db.get('unknown')).toBeNull();
  });

  it('registers many items at once', () => {
    const items = [
      { id: 'sword', name: 'Kampilan' },
      { id: 'spear', name: 'Bangka' },
    ];
    db.registerMany(items);
    expect(db.get('sword').name).toBe('Kampilan');
    expect(db.get('spear').name).toBe('Bangka');
  });

  it('throws when registering a duplicate id', () => {
    db.register('sword', { id: 'sword' });
    expect(() => db.register('sword', { id: 'sword' })).toThrow(/duplicate.*sword/);
  });

  it('throws when registering an item without id', () => {
    expect(() => db.register(null, { name: 'NoID' })).toThrow(/missing.*id/);
  });

  it('lists all ids of a given type tag', () => {
    db.registerMany([
      { id: 'sword', type: 'melee' },
      { id: 'spear', type: 'melee' },
      { id: 'fireball', type: 'magic' },
    ]);
    const meleeIds = db.idsWhere(item => item.type === 'melee');
    expect(meleeIds.sort()).toEqual(['spear', 'sword']);
  });
});
