import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { SaveManager } from '../../src/persistence/save.js';

describe('SaveManager', () => {
  let save;
  beforeEach(async () => {
    // Clean slate for each test
    indexedDB = new IDBFactory();
    save = new SaveManager('princefarmer-save');
    await save._ready();
  });

  it('returns null when no save exists', async () => {
    const data = await save.load();
    expect(data).toBeNull();
  });

  it('writes and reads back a save', async () => {
    const payload = { version: 2, player: { level: 5, attackPower: 1, xp: 0 } };
    await save.write(payload);
    const data = await save.load();
    expect(data).toEqual(payload);
  });

  it('overwrites an existing save', async () => {
    await save.write({ version: 2, player: { level: 1, attackPower: 1, xp: 0 } });
    await save.write({ version: 2, player: { level: 2, attackPower: 1, xp: 0 } });
    const data = await save.load();
    expect(data.player.level).toBe(2);
  });

  it('deletes a save', async () => {
    await save.write({ version: 1, foo: 1 });
    await save.delete();
    expect(await save.load()).toBeNull();
  });

  it('round-trips a complex object', async () => {
    const payload = {
      version: 2,
      player: {
        classId: 'lakan-alon',
        level: 7,
        attackPower: 3,
        xp: 42,
        stats: { str: 10, dex: 5, int: 3, vit: 8 },
      },
      weapons: [{ slot: 'main', id: 'sword', abilitiesPicked: ['cleave', 'parry'] }],
      passives: [{ id: 'might', stacks: 3 }],
      clearedDungeons: ['balete-grove', 'dark-forest'],
    };
    await save.write(payload);
    expect(await save.load()).toEqual(payload);
  });

  it('load() runs the migration so a v1 save is read as v2 (M2)', async () => {
    await save.write({ version: 1, player: { classId: 'farmer', hp: 50, maxHp: 100 } });
    const data = await save.load();
    expect(data.version).toBe(2);
    expect(data.player.attackPower).toBe(1);
    expect(data.player.level).toBe(1);
    expect(data.player.xp).toBe(0);
    expect(data.player.classId).toBe('farmer');
    expect(data.weapons).toEqual([{ slot: 'main', id: 'kampilan', abilitiesPicked: [] }]);
  });
});
