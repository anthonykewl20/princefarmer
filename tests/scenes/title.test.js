import { describe, it, expect, vi, beforeEach } from 'vitest';
import { titleScene, configureTitleScene, setTitleStateMachine } from '../../src/scenes/title.js';

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('title scene', () => {
  beforeEach(() => {
    titleScene.exit();
  });

  it('starts a new run via class-select when no save exists', async () => {
    const sm = { transition: vi.fn() };
    setTitleStateMachine(sm);
    configureTitleScene({
      saveManager: { load: vi.fn().mockResolvedValue(null) },
      classesRegistry: { idsWhere: () => ['lakan-alon'], get: () => ({ id: 'lakan-alon' }) },
    });

    titleScene.enter();
    await flush();
    titleScene._input = { wasJustPressed: (action) => action === 'jump' };
    titleScene.update(0.016);

    expect(sm.transition).toHaveBeenCalledWith('class-select', expect.objectContaining({
      classes: expect.any(Object),
      save: expect.any(Object),
    }));
  });

  it('continues to hub when a save exists and Enter is pressed', async () => {
    const sm = { transition: vi.fn() };
    setTitleStateMachine(sm);
    configureTitleScene({
      saveManager: {
        load: vi.fn().mockResolvedValue({
          version: 4,
          player: { classId: 'datu-hiraya', signatureAbilityId: 'earthshaker', hp: 90, maxHp: 120, level: 4, xp: 9, attackPower: 3 },
          weapons: [{ slot: 'main', id: 'baladaw', abilitiesPicked: ['ember-step', 'solar-thrust'] }],
          loadout: { passives: ['stoneheart', null, null, null, null, null] },
          ownedPassives: ['stoneheart'],
          evolutionState: {},
        }),
      },
      classesRegistry: null,
    });

    titleScene.enter();
    await flush();
    titleScene._input = { wasJustPressed: (action) => action === 'interact' };
    titleScene.update(0.016);

    expect(sm.transition).toHaveBeenCalledWith('hub', {
      player: expect.objectContaining({
        classId: 'datu-hiraya',
        signatureAbilityId: 'earthshaker',
        hp: 90,
      }),
    });
  });

  it('opens class-select for a fresh run even when a save exists if Space is pressed', async () => {
    const sm = { transition: vi.fn() };
    setTitleStateMachine(sm);
    configureTitleScene({
      saveManager: { load: vi.fn().mockResolvedValue({ version: 4, player: { classId: 'lakan-alon', signatureAbilityId: 'tidal-pulse' }, weapons: [], loadout: { passives: [] }, ownedPassives: [], evolutionState: {} }) },
      classesRegistry: { idsWhere: () => ['lakan-alon'], get: () => ({ id: 'lakan-alon' }) },
    });

    titleScene.enter();
    await flush();
    titleScene._input = { wasJustPressed: (action) => action === 'jump' };
    titleScene.update(0.016);

    expect(sm.transition).toHaveBeenCalledWith('class-select', expect.any(Object));
  });
});
