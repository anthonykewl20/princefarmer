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
    loadoutScene._input = { wasJustPressed: (a) => a === 'escape' };
    loadoutScene.enter({ player: { loadout: { main: { weaponId: 'kampilan' }, offhand: { weaponId: null }, passives: [null,null,null,null,null,null] } } });
    loadoutScene.update(0.016);
    expect(sm.transition).toHaveBeenCalledWith('hub');
  });
});
