import { test, expect } from '@playwright/test';

test.describe('PrinceFarmer smoke test', () => {
  test('boots, reaches title, and transitions through hub and dungeon', async ({ page }) => {
    const consoleMessages = [];
    page.on('console', (msg) => consoleMessages.push(msg.text()));

    await page.goto('/');

    await expect(page.locator('#game-canvas')).toBeAttached();
    await page.waitForFunction(() => window.__pf !== undefined);

    expect(await page.evaluate(() => window.__pf.sm.current)).toBe('title');
    expect(consoleMessages).toContain('[scene] enter: title');

    await page.evaluate(() => window.__pf.transition('hub'));
    expect(await page.evaluate(() => window.__pf.sm.current)).toBe('hub');
    expect(consoleMessages).toContain('[scene] enter: hub');

    await page.evaluate(() => window.__pf.enterDungeon('01-stub-sandbox'));
    expect(await page.evaluate(() => window.__pf.sm.current)).toBe('dungeon');
    expect(consoleMessages).toContain('[dungeon] enter: 01-stub-sandbox (room 01-stub-sandbox)');

    await page.evaluate(() => window.__pf.transition('hub'));
    expect(await page.evaluate(() => window.__pf.sm.current)).toBe('hub');
  });

  test('save manager round-trip', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__pf !== undefined);

    const roundTrip = await page.evaluate(async () => {
      const save = window.__pf.save;
      // Write a v3 save. SaveManager.load() runs the full migration chain
      // (v1 → v2 → v3) so the round-trip preserves M2 + M3 fields.
      const v3Payload = {
        version: 3,
        player: { level: 7, attackPower: 2, xp: 12, classId: 'lakan-alon' },
        weapons: [{ slot: 'main', id: 'kampilan', abilitiesPicked: ['lunging-strike', 'sweep'] }],
        loadout: { passives: [null, null, null, null, null, null] },
        ownedPassives: [],
        evolutionState: {},
      };
      await save.write(v3Payload);
      return await save.load();
    });
    expect(roundTrip).toEqual({
      version: 3,
      player: { level: 7, attackPower: 2, xp: 12, classId: 'lakan-alon' },
      weapons: [{ slot: 'main', id: 'kampilan', abilitiesPicked: ['lunging-strike', 'sweep'] }],
      loadout: { passives: [null, null, null, null, null, null] },
      ownedPassives: [],
      evolutionState: {},
    });
  });
});
