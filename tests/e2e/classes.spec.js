import { test, expect } from '@playwright/test';

test.describe('M4 class system E2E', () => {
  test('new run selects a class and uses its signature ability', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__pf !== undefined);

    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__pf.sm.current === 'class-select', { timeout: 5000 });
    await page.evaluate(() => {
      window.__pf.sm.scenes['class-select']._selectedIndex = 1;
    });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__pf.sm.current === 'hub', { timeout: 5000 });

    const classId = await page.evaluate(() => window.__pf.sm.scenes.hub._player?.classId);
    expect(classId).toBe('datu-kidlat');

    await page.evaluate(() => {
      window.__pf.sm.transition('dungeon', {
        dungeonId: '01-stub-sandbox',
        player: window.__pf.sm.scenes.hub._player,
        rooms: window.__pf.rooms,
        weapons: window.__pf.weapons,
        monsters: window.__pf.monsters,
        abilities: window.__pf.abilities,
        passives: window.__pf.passives,
        hubTransition: () => window.__pf.sm.transition('hub'),
      });
      const d = window.__pf.sm.scenes.dungeon;
      d._player.x = 2;
      d._player.y = 9;
      d._player.signatureLastUsedTime = -10;
      d._monsters[0].x = 3;
      d._monsters[0].y = 9;
      d._monsters[0].hp = 50;
    });

    await page.keyboard.press('KeyQ');
    await page.waitForTimeout(500);

    const hpAfter = await page.evaluate(() => window.__pf.sm.scenes.dungeon._monsters[0].hp);
    expect(hpAfter).toBeLessThan(50);
  });
});
