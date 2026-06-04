import { describe, it, expect } from 'vitest';
import classes from '../../data/classes.json' with { type: 'json' };
import weapons from '../../data/weapons.json' with { type: 'json' };
import abilities from '../../data/abilities.json' with { type: 'json' };
import passives from '../../data/passives.json' with { type: 'json' };

describe('classes.json', () => {
  it('contains the five M4 classes', () => {
    expect(classes.map((cls) => cls.id)).toEqual([
      'lakan-alon',
      'datu-kidlat',
      'raha-salakay',
      'lakan-mayari',
      'datu-hiraya',
    ]);
  });

  it('every class starter weapons and signature ability resolve', () => {
    const weaponIds = new Set(weapons.map((weapon) => weapon.id));
    const abilityIds = new Set(abilities.map((ability) => ability.id));
    const passiveIds = new Set(passives.map((passive) => passive.id));

    for (const cls of classes) {
      expect(cls.name).toBeTruthy();
      expect(abilityIds.has(cls.signatureAbilityId)).toBe(true);
      expect(weaponIds.has(cls.starterLoadout.main.weaponId)).toBe(true);
      expect(weaponIds.has(cls.starterLoadout.offhand.weaponId)).toBe(true);
      for (const passiveId of cls.starterLoadout.passives) {
        if (passiveId !== null) expect(passiveIds.has(passiveId)).toBe(true);
      }
    }
  });
});
