import { describe, it, expect } from 'vitest';
import { migrate } from '../../src/persistence/migration.js';

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
