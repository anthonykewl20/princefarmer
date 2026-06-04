import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadoutScene, setLoadoutStateMachine } from '../../src/scenes/loadout.js';

describe('loadout scene skeleton (M3)', () => {
  beforeEach(() => { loadoutScene.exit(); });

  it('enter() stores the player and resets the step', () => {
    const p = { loadout: { main: { weaponId: 'kampilan' }, offhand: { weaponId: null }, passives: [null,null,null,null,null,null] } };
    loadoutScene.enter({ player: p });
    expect(loadoutScene._step).toBe('weapons');
    expect(loadoutScene._player).toBe(p);
  });

  it('exit() clears scene state', () => {
    loadoutScene.enter({ player: {} });
    loadoutScene.exit();
    expect(loadoutScene._player).toBeNull();
    expect(loadoutScene._step).toBeNull();
  });

  it('update() advances the step on Enter (weapons → abilities)', () => {
    const sm = { transition: vi.fn() };
    setLoadoutStateMachine(sm);
    const input = { wasJustPressed: (a) => a === 'interact' };
    loadoutScene._input = input;
    loadoutScene.enter({ player: { loadout: { main: { weaponId: 'kampilan' }, offhand: { weaponId: null }, passives: [null,null,null,null,null,null] } } });
    loadoutScene.update(0.016);
    expect(loadoutScene._step).toBe('abilities');
  });

  it('update() on Esc returns to hub with discard', () => {
    const sm = { transition: vi.fn() };
    setLoadoutStateMachine(sm);
    const player = { loadout: { main: { weaponId: 'kampilan' }, offhand: { weaponId: null }, passives: [null,null,null,null,null,null] } };
    loadoutScene._input = { wasJustPressed: (a) => a === 'escape' };
    loadoutScene.enter({ player });
    loadoutScene.update(0.016);
    expect(sm.transition).toHaveBeenCalledWith('hub', { player });
  });
});

describe('loadout scene — weapons step (M3)', () => {
  beforeEach(() => { loadoutScene.exit(); });

  it('lists available weapons from the weapons registry', () => {
    const weapons = new Map([['kampilan', { id: 'kampilan' }], ['baladaw', { id: 'baladaw' }]]);
    loadoutScene.enter({ player: { loadout: { main: { weaponId: null }, offhand: { weaponId: null }, passives: [null,null,null,null,null,null] } }, weapons });
    expect(loadoutScene._stepState.weaponsList).toEqual(['kampilan', 'baladaw']);
  });

  it('confirming weapons step writes the chosen ids to player.loadout', () => {
    const weapons = new Map([['kampilan', { id: 'kampilan' }], ['baladaw', { id: 'baladaw' }]]);
    const player = { loadout: { main: { weaponId: 'kampilan', abilitiesPicked: [] }, offhand: { weaponId: null, abilitiesPicked: [] }, passives: [null,null,null,null,null,null] } };
    loadoutScene.enter({ player, weapons });
    // Manually set the picks (the picker UI is tested via integration; here
    // we set the step state directly to simulate "user picked these")
    loadoutScene._stepState.mainPick = 'kampilan';
    loadoutScene._stepState.offhandPick = 'baladaw';
    loadoutScene._commitWeapons();
    expect(player.loadout.main.weaponId).toBe('kampilan');
    expect(player.loadout.offhand.weaponId).toBe('baladaw');
  });
});

describe('loadout scene — abilities step (M3)', () => {
  beforeEach(() => { loadoutScene.exit(); });

  it('lists the 4 abilities of the main weapon', () => {
    const weapons = new Map([['kampilan', { id: 'kampilan', abilities: ['a', 'b', 'c', 'd'] }]]);
    loadoutScene.enter({ player: { loadout: { main: { weaponId: 'kampilan', abilitiesPicked: [] }, offhand: { weaponId: null, abilitiesPicked: [] }, passives: [null,null,null,null,null,null] } }, weapons });
    loadoutScene._step = 'abilities';
    expect(loadoutScene._stepState.mainAbilities).toEqual(['a', 'b', 'c', 'd']);
  });

  it('rejects a pick that fails validateAbilityPick', () => {
    const weapons = new Map([['kampilan', { id: 'kampilan', abilities: ['a', 'b', 'c', 'd'] }]]);
    loadoutScene.enter({ player: { loadout: { main: { weaponId: 'kampilan', abilitiesPicked: [] }, offhand: { weaponId: null, abilitiesPicked: [] }, passives: [null,null,null,null,null,null] } }, weapons });
    loadoutScene._step = 'abilities';
    loadoutScene._stepState.abilitiesPicks = ['a', 'a']; // duplicate
    expect(() => loadoutScene._commitAbilities()).toThrow(/same ability twice/);
  });
});

describe('loadout scene — passives step (M3)', () => {
  beforeEach(() => { loadoutScene.exit(); });

  it('commits the 6 passive slots on confirm', () => {
    const player = { loadout: { main: { weaponId: 'kampilan', abilitiesPicked: [] }, offhand: { weaponId: null, abilitiesPicked: [] }, passives: [null,null,null,null,null,null] }, ownedPassives: ['might', 'vigor'] };
    const passives = new Map([['might', { id: 'might', maxStacks: 5 }], ['vigor', { id: 'vigor', maxStacks: 5 }]]);
    loadoutScene.enter({ player, passives });
    loadoutScene._step = 'passives';
    loadoutScene._stepState.passiveSlots = ['might', 'might', 'vigor', null, null, null];
    loadoutScene._commitPassives();
    expect(player.loadout.passives).toEqual(['might', 'might', 'vigor', null, null, null]);
  });

  it('rejects a passive id not in the registry', () => {
    const player = { loadout: { main: { weaponId: 'kampilan', abilitiesPicked: [] }, offhand: { weaponId: null, abilitiesPicked: [] }, passives: [null,null,null,null,null,null] } };
    const passives = new Map([['might', { id: 'might', maxStacks: 5 }]]);
    loadoutScene.enter({ player, passives });
    loadoutScene._step = 'passives';
    loadoutScene._stepState.passiveSlots = ['mythical', null, null, null, null, null];
    expect(() => loadoutScene._commitPassives()).toThrow(/unknown passive/);
  });

  it('final confirm returns to hub with the updated player', () => {
    const sm = { transition: vi.fn() };
    setLoadoutStateMachine(sm);
    const player = { loadout: { main: { weaponId: 'kampilan', abilitiesPicked: [] }, offhand: { weaponId: null, abilitiesPicked: [] }, passives: [null,null,null,null,null,null] } };
    const passives = new Map([['might', { id: 'might', maxStacks: 5 }]]);
    loadoutScene.enter({ player, passives });
    loadoutScene._step = 'passives';
    loadoutScene._stepState.passiveSlots = ['might', null, null, null, null, null];
    loadoutScene._advance();
    expect(sm.transition).toHaveBeenCalledWith('hub', { player });
    expect(player.loadout.passives).toEqual(['might', null, null, null, null, null]);
  });
});
