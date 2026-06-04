import { describe, it, expect, beforeEach } from 'vitest';
import { GameDB, loadWeapons, loadMonsters, loadAbilities, loadClasses, loadPassives } from '../../src/engine/gamedb.js';

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

describe('loadWeapons', () => {
  it('loads weapons.json and indexes by id', () => {
    const weapons = loadWeapons();
    expect(weapons.get('kampilan')).toBeTruthy();
  });
});

describe('loadMonsters', () => {
  it('loads monsters.json and indexes by id', () => {
    const monsters = loadMonsters();
    expect(monsters.get('aswang')).toBeTruthy();
  });
});

describe('loadAbilities', () => {
  it('loads abilities.json and indexes by id', () => {
    const abilities = loadAbilities();
    expect(abilities.get('lunging-strike')).toBeTruthy();
  });
});

describe('loadPassives (M3)', () => {
  it('loads passives.json and indexes by id', () => {
    const passives = loadPassives();
    expect(passives.get('might')).toBeTruthy();
    expect(passives.size).toBe(6);
  });
});

describe('loadClasses (M4)', () => {
  it('loads classes.json and indexes by id', () => {
    const classes = loadClasses();
    expect(classes.get('lakan-alon')).toBeTruthy();
    expect(classes.get('datu-kidlat')).toBeTruthy();
    expect(classes.size).toBe(5);
  });
});
