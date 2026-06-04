import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classSelectScene } from '../../src/scenes/class-select.js';

const CLASSES = {
  idsWhere: () => ['lakan-alon', 'datu-kidlat'],
  get: (id) => ({
    'lakan-alon': {
      id: 'lakan-alon',
      name: 'Lakan Alon',
      description: 'desc',
      signatureAbilityId: 'tidal-pulse',
      starterLoadout: {
        main: { weaponId: 'kampilan', abilitiesPicked: ['lunging-strike', 'sweep'] },
        offhand: { weaponId: 'baladaw', abilitiesPicked: ['flame-slash', 'ember-step'] },
        passives: ['vigor', null, null, null, null, null],
      },
    },
    'datu-kidlat': {
      id: 'datu-kidlat',
      name: 'Datu Kidlat',
      description: 'desc2',
      signatureAbilityId: 'thunder-lunge',
      starterLoadout: {
        main: { weaponId: 'baladaw', abilitiesPicked: ['flame-slash', 'burning-lunge'] },
        offhand: { weaponId: 'kampilan', abilitiesPicked: ['thrust', 'shield-bash'] },
        passives: ['stormcall', null, null, null, null, null],
      },
    },
  })[id],
};

describe('class-select scene', () => {
  beforeEach(() => { classSelectScene.exit(); });

  it('loads classes and starts on the first entry', () => {
    classSelectScene.enter({ classes: CLASSES });
    expect(classSelectScene._classes).toHaveLength(2);
    expect(classSelectScene._classes[0].id).toBe('lakan-alon');
    expect(classSelectScene._selectedIndex).toBe(0);
  });

  it('moves selection with arrow keys', () => {
    classSelectScene.enter({ classes: CLASSES });
    classSelectScene._input = { wasJustPressed: (action) => action === 'right' };
    classSelectScene.update();
    expect(classSelectScene._selectedIndex).toBe(1);
  });

  it('confirms the selected class, saves, and transitions to hub', () => {
    const sm = { transition: vi.fn() };
    const save = { write: vi.fn().mockResolvedValue() };
    classSelectScene._stateMachine = sm;
    classSelectScene.enter({ classes: CLASSES, save });
    classSelectScene._selectedIndex = 1;
    classSelectScene._input = { wasJustPressed: (action) => action === 'interact' };

    classSelectScene.update();

    expect(save.write).toHaveBeenCalledWith(expect.objectContaining({
      version: 4,
      player: expect.objectContaining({
        classId: 'datu-kidlat',
        signatureAbilityId: 'thunder-lunge',
      }),
    }));
    expect(sm.transition).toHaveBeenCalledWith('hub', {
      player: expect.objectContaining({
        classId: 'datu-kidlat',
        signatureAbilityId: 'thunder-lunge',
        ownedPassives: ['stormcall'],
      }),
    });
  });

  it('returns to title on escape', () => {
    const sm = { transition: vi.fn() };
    classSelectScene._stateMachine = sm;
    classSelectScene.enter({ classes: CLASSES });
    classSelectScene._input = { wasJustPressed: (action) => action === 'escape' };
    classSelectScene.update();
    expect(sm.transition).toHaveBeenCalledWith('title');
  });
});
