import { describe, it, expect } from 'vitest';
import { migrate, UPGRADES, migrateV1ToV2, migrateV2ToV3, migrateV3ToV4 } from '../../src/persistence/migration.js';

describe('migrate', () => {
  it('returns the save unchanged if already at current version', () => {
    const save = { version: 1, player: { level: 5 } };
    expect(migrate(save)).toEqual(save);
  });

  it('throws on missing version', () => {
    expect(() => migrate({ player: { level: 5 } })).toThrow(/version/);
  });

  it('throws on unsupported future version', () => {
    expect(() => migrate({ version: 99, player: {} })).toThrow(/future version/);
  });

  it('applies migration v1 -> v2 when defined', () => {
    // Simulate a future migration: v2 adds a `tutorialDone` field defaulting to false.
    const v1Save = { version: 1, player: { level: 5 } };
    const v2 = migrate(v1Save, { currentVersion: 2, upgrades: { 2: (s) => ({ ...s, version: 2, tutorialDone: false }) } });
    expect(v2.version).toBe(2);
    expect(v2.tutorialDone).toBe(false);
    expect(v2.player.level).toBe(5);
  });
});

describe('migrateV1ToV2 (M2 game upgrade)', () => {
  it('adds attackPower=1, level=1, xp=0 to the player; preserves classId', () => {
    const v1 = {
      version: 1,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      player: { classId: 'lakan-alon', hp: 50, maxHp: 100 },
    };
    const v2 = migrateV1ToV2(v1);
    expect(v2.version).toBe(2);
    expect(v2.player.attackPower).toBe(1);
    expect(v2.player.level).toBe(1);
    expect(v2.player.xp).toBe(0);
    expect(v2.player.classId).toBe('lakan-alon');
    expect(v2.player.hp).toBe(50);
  });

  it('preserves existing weapons array or seeds with kampilan default', () => {
    const v1 = { version: 1, player: { classId: 'farmer' } };
    const v2 = migrateV1ToV2(v1);
    expect(Array.isArray(v2.weapons)).toBe(true);
    expect(v2.weapons).toEqual([{ slot: 'main', id: 'kampilan', abilitiesPicked: [] }]);
  });

  it('does not overwrite a player who already has attackPower (re-runs are safe)', () => {
    const v1 = { version: 1, player: { classId: 'farmer', attackPower: 4, level: 5, xp: 12 } };
    const v2 = migrateV1ToV2(v1);
    expect(v2.player.attackPower).toBe(4);
    expect(v2.player.level).toBe(5);
    expect(v2.player.xp).toBe(12);
  });
});

describe('UPGRADES registry', () => {
  it('includes the v1→v2 upgrade at key 2', () => {
    expect(typeof UPGRADES[2]).toBe('function');
  });

  it('migrate() with default options upgrades v1 → v2', () => {
    const v1 = { version: 1, player: { classId: 'farmer' } };
    const v2 = migrate(v1, { currentVersion: 2, upgrades: UPGRADES });
    expect(v2.version).toBe(2);
    expect(v2.player.attackPower).toBe(1);
  });
});

describe('migrateV2ToV3', () => {
  it('adds weapons[] with default kampilan if missing', () => {
    const v2 = { version: 2, player: { classId: 'lakan-alon', hp: 50, maxHp: 100 } };
    const v3 = migrateV2ToV3(v2);
    expect(v3.version).toBe(3);
    expect(v3.weapons).toEqual([
      { slot: 'main', id: 'kampilan', abilitiesPicked: ['lunging-strike', 'sweep'] },
    ]);
  });

  it('preserves existing weapons array', () => {
    const v2 = { version: 2, weapons: [{ slot: 'main', id: 'baladaw', abilitiesPicked: ['flame-slash', 'ember-step'] }] };
    const v3 = migrateV2ToV3(v2);
    expect(v3.weapons).toEqual([{ slot: 'main', id: 'baladaw', abilitiesPicked: ['flame-slash', 'ember-step'] }]);
  });

  it('adds empty loadout, ownedPassives, evolutionState', () => {
    const v2 = { version: 2, player: {} };
    const v3 = migrateV2ToV3(v2);
    expect(v3.loadout).toEqual({ passives: [null, null, null, null, null, null] });
    expect(v3.ownedPassives).toEqual([]);
    expect(v3.evolutionState).toEqual({});
  });
});

describe('UPGRADES registry (M3)', () => {
  it('includes the v2→v3 upgrade at key 3', () => {
    expect(typeof UPGRADES[3]).toBe('function');
  });
});

describe('migrateV3ToV4', () => {
  it('adds classId and signatureAbilityId when missing', () => {
    const v3 = { version: 3, player: { hp: 50, maxHp: 100 } };
    const v4 = migrateV3ToV4(v3);
    expect(v4.version).toBe(4);
    expect(v4.player.classId).toBe('lakan-alon');
    expect(v4.player.signatureAbilityId).toBe('tidal-pulse');
  });

  it('preserves an existing class selection', () => {
    const v3 = { version: 3, player: { classId: 'datu-kidlat', signatureAbilityId: 'thunder-lunge' } };
    const v4 = migrateV3ToV4(v3);
    expect(v4.player.classId).toBe('datu-kidlat');
    expect(v4.player.signatureAbilityId).toBe('thunder-lunge');
  });
});

describe('UPGRADES registry (M4)', () => {
  it('includes the v3→v4 upgrade at key 4', () => {
    expect(typeof UPGRADES[4]).toBe('function');
  });

  it('migrate() with default options upgrades v3 → v4', () => {
    const v3 = { version: 3, player: { hp: 80, maxHp: 100 } };
    const v4 = migrate(v3, { currentVersion: 4, upgrades: UPGRADES });
    expect(v4.version).toBe(4);
    expect(v4.player.classId).toBe('lakan-alon');
  });
});
