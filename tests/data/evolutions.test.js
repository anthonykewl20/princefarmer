import { describe, it, expect } from 'vitest';
import weapons from '../../data/weapons.json' with { type: 'json' };
import passives from '../../data/passives.json' with { type: 'json' };

describe('evolution recipes (M3)', () => {
  it('every evolvesInto recipe references a real passive', () => {
    const passiveIds = new Set(passives.map((p) => p.id));
    for (const w of weapons) {
      if (!w.evolvesInto) continue;
      for (const key of Object.keys(w.evolvesInto)) {
        const match = key.match(/^withPassive:([^:]+):count:(\d+)$/);
        expect(match, `bad key ${key} on ${w.id}`).toBeTruthy();
        const passiveId = match[1];
        expect(passiveIds.has(passiveId), `recipe ${key} on ${w.id} references unknown passive ${passiveId}`).toBe(true);
      }
    }
  });

  it('every tier-2 weapon has a parent that exists', () => {
    const ids = new Set(weapons.map((w) => w.id));
    for (const w of weapons) {
      if (w.tier === 2) {
        expect(ids.has(w.parentId), `tier-2 ${w.id} has unknown parent ${w.parentId}`).toBe(true);
      }
    }
  });

  it('tier-2 paths reference dominant elements from the registry', () => {
    const validElements = new Set(['fire','water','earth','air','lightning','spirit']);
    for (const w of weapons) {
      if (!w.tier2Paths) continue;
      for (const path of w.tier2Paths) {
        expect(validElements.has(path.dominantElement), `${w.id} tier-2 path has unknown element ${path.dominantElement}`).toBe(true);
        expect(path.elementDamageThreshold).toBeGreaterThan(0);
        expect(path.elementDamageThreshold).toBeLessThanOrEqual(1);
      }
    }
  });
});
