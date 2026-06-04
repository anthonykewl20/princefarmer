// PrinceFarmer boot
//
// On page load, this file:
//  1. Mounts the LittleJS engine on the canvas (v1.18 callback API).
//  2. Loads the (currently empty) data/ directory into the GameDB.
//  3. Creates the SaveManager.
//  4. Starts the StateMachine on the title scene.
//  5. Hooks the state machine's update into the LittleJS game loop.
//  6. Exposes a global for the Playwright E2E test to drive transitions.

import { engineInit, timeDelta, mainContext, mainCanvas } from 'littlejsengine';
import { loadJSON } from './utils/json-loader.js';
import { GameDB, loadRooms, loadDungeons, loadWeapons, loadMonsters, loadAbilities, loadPassives, loadClasses } from './engine/gamedb.js';
import { SaveManager } from './persistence/save.js';
import { StateMachine } from './scenes/state-machine.js';
import { titleScene, setTitleStateMachine, configureTitleScene } from './scenes/title.js';
import { hubScene, setHubStateMachine, setEnterDungeon, setOpenLoadout } from './scenes/hub.js';
import { dungeonScene, setDungeons } from './scenes/dungeon.js';
import { deathScene } from './scenes/death.js';
import { levelupScene } from './scenes/levelup.js';
import { classSelectScene } from './scenes/class-select.js';
import { loadoutScene, setLoadoutStateMachine } from './scenes/loadout.js';
import { registerServiceWorker } from './sw-register.js';

const root = document.getElementById('game-root');
if (!root) throw new Error('game-root not found in DOM');

/** Loads all room + dungeon JSON into GameDBs. */
function loadContent() {
  return {
    rooms: loadRooms(),
    dungeons: loadDungeons(),
  };
}

async function boot() {
  const { rooms, dungeons } = loadContent();
  setDungeons(dungeons);
  const save = new SaveManager('princefarmer-save');
  await save._ready();

  // M2 + M3: combat + build data registries
  const weapons = loadWeapons();
  const monsters = loadMonsters();
  const abilities = loadAbilities();
  const passives = loadPassives();
  const classes = loadClasses();

  // Build a dungeon-entry ctx once and reuse it for both the normal
  // hub→dungeon path and the E2E test's manual transition.
  const dungeonCtx = (id, player = undefined) => ({
    dungeonId: id,
    player,
    rooms,
    weapons,
    monsters,
    abilities,
    passives,
    hubTransition: () => sm.transition('hub'),
  });

  const sm = new StateMachine('title', {
    title: titleScene,
    'class-select': classSelectScene,
    hub: hubScene,
    dungeon: dungeonScene,
    death: deathScene,
    levelup: levelupScene,
    loadout: loadoutScene,
  });

  setTitleStateMachine(sm);
  configureTitleScene({ saveManager: save, classesRegistry: classes, abilities });

  setHubStateMachine(sm);
  setLoadoutStateMachine(sm);
  setEnterDungeon((id, player) => sm.transition('dungeon', dungeonCtx(id, player)));
  setOpenLoadout((player) => sm.transition('loadout', { player, weapons, passives }));

  // Mount LittleJS v1.18 with the canvas as the root element and
  // route the per-frame gameUpdate callback into our state machine.
  // LittleJS exposes the frame's delta time as the `timeDelta` export.
  engineInit(
    undefined,                              // gameInit (no async init needed)
    () => sm.update(timeDelta),             // gameUpdate
    undefined,                              // gameUpdatePost
    undefined,                              // gameRender
    () => sm.render(mainContext),           // gameRenderPost
    [],                                     // imageSources
    root                                    // rootElement
  );

  if (mainCanvas) {
    mainCanvas.id = 'game-canvas';
    mainCanvas.style.width = '100vw';
    mainCanvas.style.height = '100vh';
  }

  // Expose for the Playwright E2E test to drive transitions.
  window.__pf = {
    db: rooms, save, sm, rooms, dungeons,
    weapons, monsters, abilities, passives, classes,
    transition: (s, ctx) => sm.transition(s, ctx),
    enterDungeon: (id, player) => sm.transition('dungeon', dungeonCtx(id, player)),
  };

  registerServiceWorker();

  console.log('PrinceFarmer boot OK');
}

boot().catch((err) => {
  console.error('PrinceFarmer boot failed:', err);
  throw err;
});
