import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dungeonScene, setDungeons } from '../../src/scenes/dungeon.js';
import { TILE_SIZE } from '../../src/engine/tiles.js';

// Mock littlejsengine so we can load the scene without a real canvas.
vi.mock('littlejsengine', () => ({
  setCameraPos: vi.fn(),
  vec2: (x, y) => ({ x, y }),
}));

function setupDungeon(overrides = {}) {
  // Provide a minimal dungeons map + a single room with a solid ground row.
  const dungeon = {
    id: 'test-dungeon',
    rooms: ['test-room'],
  };
  const room = {
    id: 'test-room',
    type: 'platforming',
    width: 10,
    height: 5,
    spawn: { x: 1, y: 3 },
    exit: { x: 8, y: 1 },
    // bottom row is solid; everything else is empty
    tiles: [
      '..........'.slice(0, 10),
      '..........'.slice(0, 10),
      '..........'.slice(0, 10),
      '..........'.slice(0, 10),
      '##########'.slice(0, 10),
    ],
    props: [],
    ...overrides.room,
  };
  setDungeons(new Map([[dungeon.id, dungeon]]));
  return { dungeon, room };
}

describe('dungeon scene', () => {
  beforeEach(() => {
    // Reset the scene between tests
    dungeonScene.exit();
  });

  describe('enter', () => {
    it('loads the dungeon, builds the grid, and spawns the player', () => {
      const { dungeon, room } = setupDungeon();
      const hubTransition = vi.fn();
      dungeonScene.enter({ dungeonId: dungeon.id, rooms: new Map([[room.id, room]]), hubTransition });
      expect(dungeonScene._player).toBeTruthy();
      expect(dungeonScene._player.x).toBe(room.spawn.x);
      expect(dungeonScene._player.y).toBe(room.spawn.y);
      expect(dungeonScene._grid.width).toBe(room.width);
      expect(dungeonScene._camera.room.width).toBe(room.width);
    });

    it('warns and bails when the dungeon is missing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const hubTransition = vi.fn();
      dungeonScene.enter({ dungeonId: 'nope', rooms: new Map(), hubTransition });
      expect(warn).toHaveBeenCalled();
      expect(dungeonScene._active).toBeNull();
      warn.mockRestore();
    });

    it('reuses the player passed in ctx instead of creating a fresh one', () => {
      const { dungeon, room } = setupDungeon();
      const player = {
        hp: 87,
        maxHp: 120,
        level: 4,
        xp: 22,
        attackPower: 9,
        input: null,
        weapon: { id: null, template: null, lastAttackTime: 0, lastAbilityTime: 0 },
        loadout: {
          main: { weaponId: 'kampilan', abilitiesPicked: [] },
          offhand: { weaponId: null, abilitiesPicked: [] },
          passives: [null, null, null, null, null, null],
        },
        ownedPassives: [],
        evolutionState: {},
      };
      dungeonScene.enter({
        dungeonId: dungeon.id,
        rooms: new Map([[room.id, room]]),
        weapons: new Map([['kampilan', { id: 'kampilan', autoAttack: { range: 1, shape: 'arc', arc: 1, tick: 1, damage: 1 }, abilities: [] }]]),
        hubTransition: vi.fn(),
        player,
      });
      expect(dungeonScene._player).toBe(player);
      expect(dungeonScene._player.hp).toBe(87);
      expect(dungeonScene._player.level).toBe(4);
      expect(dungeonScene._player.x).toBe(room.spawn.x);
      expect(dungeonScene._player.y).toBe(room.spawn.y);
      expect(dungeonScene._player.input).toBeTruthy();
    });
  });

  describe('update — vertical collision resolution (regression: ground sink-through)', () => {
    it('snaps the player to the top of the solid tile and zeroes vy when onGround', () => {
      const { dungeon, room } = setupDungeon();
      const hubTransition = vi.fn();
      dungeonScene.enter({ dungeonId: dungeon.id, rooms: new Map([[room.id, room]]), hubTransition });

      const p = dungeonScene._player;
      // Force the player just above the ground row, with downward velocity,
      // simulating the frame AFTER a fall. The foot tile at row 4 is solid.
      p.x = 5;
      p.y = 4 * TILE_SIZE - 0.001; // just above the solid row
      p.vy = 5;
      p.onGround = false;

      dungeonScene.update(0.016);

      // Player should be snapped to the top of the solid tile (y = 4 * TILE_SIZE)
      // with vy reset, and onGround should be true.
      expect(p.y).toBeCloseTo(4 * TILE_SIZE, 5);
      expect(p.vy).toBe(0);
      expect(p.onGround).toBe(true);
    });
  });

  describe('render — HUD in pixel space (regression: world-units mismatch)', () => {
    it('resets the canvas transform to identity before drawing the HUD', () => {
      const { dungeon, room } = setupDungeon();
      const hubTransition = vi.fn();
      dungeonScene.enter({ dungeonId: dungeon.id, rooms: new Map([[room.id, room]]), hubTransition });

      const calls = [];
      const ctx = {
        canvas: { width: 800, height: 600 },
        save: vi.fn(() => calls.push('save')),
        restore: vi.fn(() => calls.push('restore')),
        setTransform: vi.fn(() => calls.push('setTransform')),
        fillStyle: '',
        fillRect: vi.fn(),
        strokeStyle: '',
        strokeRect: vi.fn(),
        lineWidth: 0,
        font: '',
        textAlign: '',
        fillText: vi.fn(),
      };
      dungeonScene.render(ctx);

      // The sequence must be: save → setTransform(1,0,0,1,0,0) → restore,
      // wrapping the drawHud fillRect calls.
      const saveIdx = calls.indexOf('save');
      const setTransformIdx = calls.indexOf('setTransform');
      const restoreIdx = calls.indexOf('restore');
      expect(saveIdx).toBeGreaterThanOrEqual(0);
      expect(setTransformIdx).toBeGreaterThan(saveIdx);
      expect(restoreIdx).toBeGreaterThan(setTransformIdx);
      expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    });
  });

  describe('update — combat', () => {
    it('auto-attack fires when an enemy is in range and on cooldown', () => {
      const { dungeon, room } = setupDungeon({
        room: {
          width: 10, height: 5,
          spawn: { x: 1, y: 3 },
          exit: { x: 8, y: 1 },
          tiles: ['..........', '..........', '..........', '..........', '..........'],
          props: [],
          monsterSpawns: [{ monsterId: 'aswang', x: 2, y: 3, count: 1 }],
        },
      });
      const roomObj = { id: 'r1', ...room };
      setDungeons(new Map([[dungeon.id, dungeon]]));
      dungeonScene.enter({
        dungeonId: dungeon.id,
        rooms: new Map([[roomObj.id, roomObj]]),
        weapons: new Map([['kampilan', { id: 'kampilan', autoAttack: { range: 1.2, shape: 'arc', arc: Math.PI / 2, tick: 0.6, damage: 20 }, abilities: [] }]]),
        monsters: new Map([['aswang', { id: 'aswang', hp: 30, damage: 8, speed: 1.5, contactRange: 0.6, behavior: 'strafe-lunge', drops: [] }]]),
        abilities: new Map(),
        hubTransition: vi.fn(),
      });
      dungeonScene._rng = () => 0.5;

      // Set the player's weapon and force a cooldowned state
      const p = dungeonScene._player;
      p.weapon.id = 'kampilan';
      p.weapon.template = dungeonScene._weapons.get('kampilan');
      p.weapon.lastAttackTime = -1; // long ago, ready to fire
      p.x = 1; p.y = 3;

      // Player is at (1, 3), aswang at (2, 3) — distance 1.0, in range
      dungeonScene.update(0.1);

      expect(dungeonScene._monsters[0].hp).toBeLessThan(30);
    });
  });

  describe('update — onGround guard during jump (regression: jump-cancel)', () => {
    it('does NOT set onGround (and does NOT snap to ground) when player is moving upward through a solid tile', () => {
      // Use a room with a solid floor and a 1-tile-thick solid ceiling
      // overlapping where the player would land mid-jump.
      const { dungeon } = setupDungeon({
        room: {
          width: 5,
          height: 5,
          spawn: { x: 1, y: 3 },
          exit: { x: 4, y: 0 },
          // Top row solid, bottom row solid, middle empty
          tiles: [
            '#####',
            '.....',
            '.....',
            '.....',
            '#####',
          ],
        },
      });
      const room = dungeon.rooms[0];
      const hubTransition = vi.fn();
      // Build a rooms map keyed by the actual room id
      const roomObj = {
        id: room,
        type: 'platforming',
        width: 5, height: 5,
        spawn: { x: 1, y: 3 },
        exit: { x: 4, y: 0 },
        tiles: ['#####', '.....', '.....', '.....', '#####'],
        props: [],
      };
      dungeonScene.enter({
        dungeonId: dungeon.id,
        rooms: new Map([[roomObj.id, roomObj]]),
        hubTransition,
      });

      const p = dungeonScene._player;
      // Place the player at the top row, moving upward (mid-jump), so
      // the post-movement foot sample would be 'solid' but they shouldn't
      // be considered onGround.
      p.x = 1;
      p.y = 0.5; // foot row = 1 (just below the solid top row at row 0)
      p.vy = -5; // moving upward
      p.onGround = false;

      dungeonScene.update(0.016);

      // vy must still be negative (jump not cancelled)
      expect(p.vy).toBeLessThan(0);
      // y must not have been snapped to the top of any solid tile
      // (i.e. not reset to 0 by the ground collision resolver)
      expect(p.y).toBeGreaterThan(0);
      expect(p.onGround).toBe(false);
    });
  });

  describe('update — loadout resolution (M3)', () => {
    it('resolves tier-1 evolution at enter when a recipe matches', () => {
      const { dungeon, room } = setupDungeon();
      const kampilan = {
        id: 'kampilan', element: 'spirit',
        autoAttack: { range: 1.2, shape: 'arc', arc: Math.PI / 2, tick: 0.6, damage: 20 },
        abilities: ['lunging-strike', 'sweep', 'thrust', 'shield-bash'],
        evolvesInto: { 'withPassive:might:count:3': 'tiger-claw' },
      };
      const tigerClaw = {
        id: 'tiger-claw', tier: 2, parentId: 'kampilan',
        autoAttack: { range: 1.4, shape: 'arc', arc: 2.0, tick: 0.5, damage: 35 },
        abilities: ['tiger-roar', 'lunge-3'],
      };
      const passives = new Map([['might', { id: 'might', element: 'fire', effect: { stat: 'attackPower', op: 'add', value: 1 }, maxStacks: 5, tier: 1 }]]);
      const player = {
        loadout: {
          main:    { weaponId: 'kampilan', abilitiesPicked: ['sweep', 'thrust'] },
          offhand: { weaponId: null,       abilitiesPicked: [] },
          passives: ['might', 'might', 'might', null, null, null],
        },
        ownedPassives: ['might'],
        evolutionState: {},
        attackPower: 1,
      };
      dungeonScene.enter({
        dungeonId: dungeon.id,
        rooms: new Map([[room.id, room]]),
        weapons: new Map([['kampilan', kampilan], ['tiger-claw', tigerClaw]]),
        monsters: new Map(),
        passives,
        hubTransition: vi.fn(),
      });
      // Inject the player with the M3 loadout
      Object.assign(dungeonScene._player, player);

      // Re-enter so _resolveLoadout runs with the new player state
      dungeonScene.enter({
        dungeonId: dungeon.id,
        rooms: new Map([[room.id, room]]),
        weapons: new Map([['kampilan', kampilan], ['tiger-claw', tigerClaw]]),
        monsters: new Map(),
        passives,
        hubTransition: vi.fn(),
      });
      // Re-inject because enter() recreates the player
      Object.assign(dungeonScene._player, player);

      // After re-enter, the weapon should be evolved
      expect(dungeonScene._player.weapon.template.id).toBe('tiger-claw');
      expect(dungeonScene._player.evolutionState.kampilan).toBeTruthy();
    });

    it('does not evolve when the loadout does not match a recipe', () => {
      const { dungeon, room } = setupDungeon();
      const kampilan = {
        id: 'kampilan', element: 'spirit',
        autoAttack: { range: 1.2, shape: 'arc', arc: Math.PI / 2, tick: 0.6, damage: 20 },
        abilities: ['lunging-strike', 'sweep', 'thrust', 'shield-bash'],
        evolvesInto: { 'withPassive:might:count:3': 'tiger-claw' },
      };
      const passives = new Map([['might', { id: 'might', element: 'fire', effect: { stat: 'attackPower', op: 'add', value: 1 }, maxStacks: 5, tier: 1 }]]);
      dungeonScene.enter({
        dungeonId: dungeon.id,
        rooms: new Map([[room.id, room]]),
        weapons: new Map([['kampilan', kampilan]]),
        monsters: new Map(),
        passives,
        hubTransition: vi.fn(),
      });
      Object.assign(dungeonScene._player, {
        loadout: { main: { weaponId: 'kampilan', abilitiesPicked: [] }, offhand: { weaponId: null, abilitiesPicked: [] }, passives: ['might', null, null, null, null, null] },
        ownedPassives: ['might'],
        evolutionState: {},
      });
      dungeonScene.enter({
        dungeonId: dungeon.id,
        rooms: new Map([[room.id, room]]),
        weapons: new Map([['kampilan', kampilan]]),
        monsters: new Map(),
        passives,
        hubTransition: vi.fn(),
      });
      Object.assign(dungeonScene._player, {
        loadout: { main: { weaponId: 'kampilan', abilitiesPicked: [] }, offhand: { weaponId: null, abilitiesPicked: [] }, passives: ['might', null, null, null, null, null] },
        ownedPassives: ['might'],
        evolutionState: {},
      });
      expect(dungeonScene._player.weapon.template.id).toBe('kampilan');
    });
  });

  describe('update — tier-2 evolution tracking (M3)', () => {
    it('increments kill count and element damage on hit/kill', () => {
      const { dungeon, room } = setupDungeon({
        room: {
          width: 5, height: 3,
          spawn: { x: 1, y: 1 },
          exit: { x: 4, y: 0 },
          tiles: ['.....', '.....', '#####'],
          props: [],
          monsterSpawns: [{ monsterId: 'aswang', x: 2, y: 1, count: 1 }],
        },
      });
      const kampilan = {
        id: 'kampilan', element: 'spirit',
        autoAttack: { range: 1.2, shape: 'arc', arc: Math.PI / 2, tick: 0.01, damage: 30 },
        abilities: ['lunging-strike'],
      };
      const aswang = {
        id: 'aswang', hp: 1, damage: 1, speed: 1, contactRange: 0.6, behavior: 'strafe-lunge', drops: [],
      };
      dungeonScene.enter({
        dungeonId: dungeon.id,
        rooms: new Map([[room.id, room]]),
        weapons: new Map([['kampilan', kampilan]]),
        monsters: new Map([['aswang', aswang]]),
        passives: new Map(),
        hubTransition: vi.fn(),
      });
      const p = dungeonScene._player;
      p.x = 1; p.y = 1;
      p.weapon.template = kampilan;
      p.weapon.lastAttackTime = -1;

      dungeonScene.update(0.1);

      // The aswang was killed (hp was 1, dmg 30)
      const state = p.evolutionState.kampilan;
      expect(state).toBeTruthy();
      expect(state.kills).toBe(1);
      expect(state.elementDamage.spirit).toBeGreaterThan(0);
    });
  });

  describe('update — class signature ability (M4)', () => {
    it('fires the selected signature ability on attack2', () => {
      const { dungeon, room } = setupDungeon({
        room: {
          width: 5, height: 3,
          spawn: { x: 1, y: 1 },
          exit: { x: 4, y: 0 },
          tiles: ['.....', '.....', '#####'],
          props: [],
          monsterSpawns: [{ monsterId: 'aswang', x: 2, y: 1, count: 1 }],
        },
      });
      const kampilan = {
        id: 'kampilan', element: 'spirit',
        autoAttack: { range: 1.2, shape: 'arc', arc: Math.PI / 2, tick: 99, damage: 1 },
        abilities: ['lunging-strike'],
      };
      const aswang = {
        id: 'aswang', hp: 20, damage: 1, speed: 1, contactRange: 0.6, behavior: 'strafe-lunge', drops: [],
      };
      const abilities = new Map([[
        'tidal-pulse',
        { id: 'tidal-pulse', element: 'water', damage: 24, cooldown: 1, range: 1.6, aoe: { shape: 'circle', radius: 1.6 } },
      ]]);
      dungeonScene.enter({
        dungeonId: dungeon.id,
        rooms: new Map([[room.id, room]]),
        weapons: new Map([['kampilan', kampilan]]),
        monsters: new Map([['aswang', aswang]]),
        abilities,
        passives: new Map(),
        hubTransition: vi.fn(),
      });

      const p = dungeonScene._player;
      p.x = 1;
      p.y = 1;
      p.signatureAbilityId = 'tidal-pulse';
      p.signatureLastUsedTime = -10;
      dungeonScene._input = {
        isPressed: () => false,
        wasJustPressed: (action) => action === 'attack2',
      };

      dungeonScene.update(0.1);

      expect(dungeonScene._monsters.length).toBe(0);
      expect(p.signatureLastUsedTime).toBeGreaterThan(0);
      expect(p.evolutionState.kampilan.elementDamage.water).toBeGreaterThan(0);
    });
  });
});
