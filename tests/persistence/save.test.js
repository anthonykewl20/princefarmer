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
    const payload = {
      version: 4,
      player: { level: 5, attackPower: 1, xp: 0, maxHp: 100, hp: 100, classId: 'lakan-alon', signatureAbilityId: 'tidal-pulse' },
      weapons: [{ slot: 'main', id: 'kampilan', abilitiesPicked: ['sweep', 'thrust'] }],
      loadout: { passives: [null, null, null, null, null, null] },
      ownedPassives: [],
      evolutionState: {},
    };
    await save.write(payload);
    const data = await save.load();
    expect(data).toEqual(payload);
  });

  it('overwrites an existing save', async () => {
    const base = { version: 4, weapons: [{ slot: 'main', id: 'kampilan', abilitiesPicked: [] }], loadout: { passives: [null,null,null,null,null,null] }, ownedPassives: [], evolutionState: {} };
    await save.write({ ...base, player: { level: 1, attackPower: 1, xp: 0, classId: 'lakan-alon', signatureAbilityId: 'tidal-pulse' } });
    await save.write({ ...base, player: { level: 2, attackPower: 1, xp: 0, classId: 'lakan-alon', signatureAbilityId: 'tidal-pulse' } });
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
      version: 4,
      player: { classId: 'lakan-alon', signatureAbilityId: 'tidal-pulse', level: 7, attackPower: 3, xp: 42, stats: { str: 10, dex: 5, int: 3, vit: 8 }, maxHp: 110, hp: 100 },
      weapons: [
        { slot: 'main',    id: 'kampilan', abilitiesPicked: ['sweep', 'thrust'] },
        { slot: 'offhand', id: 'baladaw',  abilitiesPicked: ['flame-slash', 'ember-step'] },
      ],
      loadout: { passives: ['might', 'might', null, null, null, null] },
      ownedPassives: ['might'],
      evolutionState: { kampilan: { tier: 1, kills: 50, elementDamage: { fire: 20, spirit: 100 } } },
      passives: [{ id: 'might', stacks: 3 }],
      clearedDungeons: ['balete-grove', 'dark-forest'],
    };
    await save.write(payload);
    expect(await save.load()).toEqual(payload);
  });

  it('load() runs the migration chain so a v1 save is read as v4', async () => {
    await save.write({ version: 1, player: { classId: 'farmer', hp: 50, maxHp: 100 } });
    const data = await save.load();
    expect(data.version).toBe(4);
    expect(data.player.attackPower).toBe(1);
    expect(data.player.level).toBe(1);
    expect(data.player.xp).toBe(0);
    expect(data.player.classId).toBe('farmer');
    expect(data.player.signatureAbilityId).toBe('tidal-pulse');
    expect(data.weapons).toEqual([{ slot: 'main', id: 'kampilan', abilitiesPicked: [] }]);
    expect(data.loadout.passives).toEqual([null, null, null, null, null, null]);
    expect(data.ownedPassives).toEqual([]);
    expect(data.evolutionState).toEqual({});
  });

  it('load() runs the v2→v4 migration', async () => {
    await save.write({ version: 2, player: { classId: 'farmer', hp: 50, maxHp: 100 } });
    const data = await save.load();
    expect(data.version).toBe(4);
    expect(data.loadout.passives).toEqual([null, null, null, null, null, null]);
    expect(data.ownedPassives).toEqual([]);
    expect(data.evolutionState).toEqual({});
  });

  it('load() runs the v3→v4 migration', async () => {
    await save.write({ version: 3, player: { hp: 100, maxHp: 100 } });
    const data = await save.load();
    expect(data.version).toBe(4);
    expect(data.player.classId).toBe('lakan-alon');
    expect(data.player.signatureAbilityId).toBe('tidal-pulse');
  });
});
