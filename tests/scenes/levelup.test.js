import { describe, it, expect, vi, beforeEach } from 'vitest';
import { levelupScene } from '../../src/scenes/levelup.js';
import { pickPassiveChoices } from '../../src/engine/passivedrop.js';
import { SaveManager } from '../../src/persistence/save.js';

describe('levelup scene', () => {
  beforeEach(() => { levelupScene.exit(); });

  it('enter() stores the timer, dungeonId, and player', () => {
    const p = { level: 1, maxHp: 100, hp: 100, attackPower: 1 };
    levelupScene.enter({ dungeonId: 'd1', player: p });
    expect(levelupScene._timer).toBe(0);
    expect(levelupScene._dungeonId).toBe('d1');
    expect(levelupScene._player).toBe(p);
  });

  it('update() ticks timer; transitions to dungeon only after interact (M3)', () => {
    const p = { level: 1, maxHp: 100, hp: 100, attackPower: 1, loadout: { passives: [] } };
    const sm = { transition: vi.fn() };
    levelupScene._stateMachine = sm;
    levelupScene.enter({ dungeonId: 'd1', player: p });
    levelupScene._choices = [];
    levelupScene._input = null;
    levelupScene.update(0.5);
    expect(sm.transition).not.toHaveBeenCalled();
    levelupScene.update(0.6); // total 1.1s — no transition yet (M3 waits for interact)
    expect(sm.transition).not.toHaveBeenCalled();
    // No choices → even with interact, no transition
    levelupScene._input = { wasJustPressed: (a) => a === 'interact' };
    levelupScene.update(0.016);
    expect(sm.transition).not.toHaveBeenCalled();
    // With a choice + interact, transition fires
    levelupScene._choices = ['might'];
    levelupScene.update(0.016);
    expect(sm.transition).toHaveBeenCalledWith('dungeon', { dungeonId: 'd1', player: p });
  });

  it('exit() applies rewards, clears pendingLevelUp, saves', () => {
    const p = {
      classId: 'farmer',
      signatureAbilityId: 'tidal-pulse',
      level: 1,
      xp: 7,
      maxHp: 100,
      hp: 50,
      attackPower: 1,
      pendingLevelUp: true,
      loadout: {
        main: { weaponId: 'kampilan', abilitiesPicked: ['sweep'] },
        offhand: { weaponId: null, abilitiesPicked: [] },
        passives: [null, null, null, null, null, null],
      },
      ownedPassives: [],
      evolutionState: {},
    };
    levelupScene._player = p;
    const saveSpy = vi.spyOn(SaveManager, 'save').mockResolvedValue();
    levelupScene.exit();
    expect(p.level).toBe(2);
    expect(p.maxHp).toBe(105);
    expect(p.hp).toBe(105);
    expect(p.attackPower).toBe(2);
    expect(p.pendingLevelUp).toBe(false);
    expect(saveSpy).toHaveBeenCalledWith({
      version: 4,
      player: {
        classId: 'farmer',
        signatureAbilityId: 'tidal-pulse',
        hp: 105,
        maxHp: 105,
        level: 2,
        xp: 7,
        attackPower: 2,
      },
      weapons: [
        { slot: 'main', id: 'kampilan', abilitiesPicked: ['sweep'] },
        { slot: 'offhand', id: null, abilitiesPicked: [] },
      ],
      loadout: { passives: [null, null, null, null, null, null] },
      ownedPassives: [],
      evolutionState: {},
    });
    saveSpy.mockRestore();
  });
});

describe('levelup scene — passive choice (M3)', () => {
  beforeEach(() => { levelupScene.exit(); });

  it('enter() shows 3 passive choices and a 1.0s timer', () => {
    const p = { ownedPassives: [], loadout: { passives: [null,null,null,null,null,null] } };
    const passives = [
      { id: 'might', maxStacks: 5, tier: 1 },
      { id: 'vigor', maxStacks: 5, tier: 1 },
      { id: 'haste', maxStacks: 5, tier: 1 },
    ];
    levelupScene.enter({ player: p, passives, weapons: new Map() });
    expect(levelupScene._choices.length).toBe(3);
    expect(levelupScene._timer).toBe(0);
  });

  it('on Enter, applies a new passive to ownedPassives and the first null slot', () => {
    const p = { ownedPassives: [], loadout: { passives: ['might', null, null, null, null, null] } };
    const passives = [{ id: 'might', maxStacks: 5, tier: 1 }, { id: 'vigor', maxStacks: 5, tier: 1 }];
    levelupScene.enter({ player: p, passives, weapons: new Map() });
    levelupScene._timer = 1.0; // skip the flash
    // Force a known choice
    levelupScene._choices = ['vigor'];
    levelupScene._input = { wasJustPressed: (a) => a === 'interact' };
    levelupScene.update(0.016);
    expect(p.ownedPassives).toContain('vigor');
    expect(p.loadout.passives).toEqual(['might', 'vigor', null, null, null, null]);
  });
});
