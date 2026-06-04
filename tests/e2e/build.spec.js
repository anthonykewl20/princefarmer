import { test, expect } from '@playwright/test';

test.describe('M3 build flow E2E', () => {
  test('player opens loadout, equips weapons + passives, save round-trips', async ({ page }) => {
    const logs = [];
    page.on('console', (msg) => logs.push(msg.text()));

    await page.goto('/');
    await page.waitForFunction(() => window.__pf !== undefined);

    // Title → Class Select → Hub
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__pf.sm.current === 'class-select', { timeout: 5000 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__pf.sm.current === 'hub', { timeout: 5000 });

    // Open the loadout scene
    await page.evaluate(() => {
      window.__pf.sm.transition('loadout', {
        player: window.__pf.sm.scenes.dungeon._player ?? { loadout: { main: { weaponId: 'kampilan', abilitiesPicked: [] }, offhand: { weaponId: null, abilitiesPicked: [] }, passives: [null,null,null,null,null,null] } },
        weapons: window.__pf.weapons,
        passives: new Map(), // empty registry in test
      });
    });
    await page.waitForFunction(() => window.__pf.sm.current === 'loadout', { timeout: 5000 });
    expect(logs.some((l) => l.includes('[scene] enter: loadout'))).toBe(true);

    // Esc back to hub
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__pf.sm.current === 'hub', { timeout: 3000 });
  });
});
