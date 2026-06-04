import { test, expect } from '@playwright/test';

test.describe('M2 combat E2E', () => {
  test('hero fights aswang, gains XP, dies and respawns at hub', async ({ page }) => {
    const logs = [];
    page.on('console', (msg) => logs.push(msg.text()));

    await page.goto('/');
    await expect(page.locator('#game-canvas')).toBeAttached();
    await page.waitForFunction(() => window.__pf !== undefined);

    // Title → Class Select → Hub
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__pf.sm.current === 'class-select', { timeout: 5000 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__pf.sm.current === 'hub', { timeout: 5000 });

    // Hub → Dungeon. Use the manual transition (with full combat ctx)
    // rather than __pf.enterDungeon so the E2E doesn't depend on the
    // hub scene's interaction hot-spot.
    await page.evaluate(() => {
      window.__pf.sm.transition('dungeon', {
        dungeonId: '01-stub-sandbox',
        rooms: window.__pf.rooms,
        weapons: window.__pf.weapons,
        monsters: window.__pf.monsters,
        abilities: window.__pf.abilities,
        passives: window.__pf.passives,
        hubTransition: () => window.__pf.sm.transition('hub'),
        player: window.__pf.sm.scenes.hub._player,
      });
    });
    await page.waitForFunction(() => window.__pf.sm.current === 'dungeon', { timeout: 5000 });
    expect(logs.some((l) => l.includes('[dungeon] enter'))).toBe(true);

    // Verify 4 aswang spawned (3 + 1 from the room config)
    const monsterCount = await page.evaluate(
      () => window.__pf.sm.scenes.dungeon._monsters.length,
    );
    expect(monsterCount).toBe(4);

    // Drive the combat deterministically: place the player and one aswang
    // next to each other and put the aswang at 1 HP. The auto-attack
    // tick is 0.6s, so 1.5s is plenty for the kill.
    await page.evaluate(() => {
      const d = window.__pf.sm.scenes.dungeon;
      // Park the player on solid ground so they don't fall through
      // the world mid-test.
      d._player.x = 2;
      d._player.y = 9;
      d._player.vx = 0;
      d._player.vy = 0;
      // First aswang right next to the player — in kampilan arc range
      d._monsters[0].x = 2.5;
      d._monsters[0].y = 9;
      d._monsters[0].hp = 1;
      // Clear the auto-attack cooldown so the next update fires it
      d._player.weapon.lastAttackTime = -1;
    });

    // Let auto-attack fire (1.5s > 0.6s tick)
    await page.waitForTimeout(1500);

    // Verify the aswang was killed
    const afterCount = await page.evaluate(
      () => window.__pf.sm.scenes.dungeon._monsters.length,
    );
    expect(afterCount).toBe(3);
    expect(logs.some((l) => l.includes('[pickup] spawn: xp gem'))).toBe(true);

    // Force-kill the player to test the death flow. The next dungeon
    // update() observes p.hp <= 0 and transitions to the death scene.
    await page.evaluate(() => {
      const p = window.__pf.sm.scenes.dungeon._player;
      // Move player far from any remaining aswang so contact damage
      // doesn't reset hp before the death check runs.
      p.x = 100;
      p.y = 9;
      p.hp = 0;
    });

    // Wait for the death transition. (The dungeon scene's update
    // hook fires from the LittleJS game loop on the next frame, so
    // a small timeout is enough — but we leave headroom for CI.)
    await page.waitForFunction(() => window.__pf.sm.current === 'death', { timeout: 3000 });
    expect(logs.some((l) => l.includes('[dungeon] player died'))).toBe(true);

    // Wait for the death overlay to expire and transition to hub (1.5s)
    await page.waitForFunction(() => window.__pf.sm.current === 'hub', { timeout: 5000 });

    // Verify HP is restored on hub enter (hub.enter() sets hp = maxHp)
    const hubPlayerHp = await page.evaluate(
      () => window.__pf.sm.scenes.hub._player?.hp,
    );
    expect(hubPlayerHp).toBe(100);
    expect(
      logs.some((l) => l.includes('[scene] enter: hub')),
    ).toBe(true);
  });
});
