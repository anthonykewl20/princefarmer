// PrinceFarmer boot
//
// On page load, this file:
//  1. Mounts the LittleJS engine on the canvas (v1.18 callback API).
//  2. Loads the (currently empty) data/ directory into the GameDB.
//  3. Creates the SaveManager.
//  4. Starts the StateMachine on the title scene.
//  5. Hooks the state machine's update into the LittleJS game loop.
//  6. Exposes a global for the Playwright E2E test to drive transitions.

import { engineInit, timeDelta } from 'littlejsengine';
import { loadJSON } from './utils/json-loader.js';
import { GameDB, loadRooms, loadDungeons, loadWeapons, loadMonsters, loadAbilities } from './engine/gamedb.js';
import { SaveManager } from './persistence/save.js';
import { StateMachine } from './scenes/state-machine.js';
import { titleScene, setTitleStateMachine } from './scenes/title.js';
import { hubScene, setHubStateMachine, setEnterDungeon } from './scenes/hub.js';
import { dungeonScene, setDungeons } from './scenes/dungeon.js';
import { deathScene } from './scenes/death.js';
import { levelupScene } from './scenes/levelup.js';
import { registerServiceWorker } from './sw-register.js';

const canvas = document.getElementById('game-canvas');
if (!canvas) throw new Error('game-canvas not found in DOM');

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

  // M2: combat data registries
  const weapons = loadWeapons();
  const monsters = loadMonsters();
  const abilities = loadAbilities();

  // Build a dungeon-entry ctx once and reuse it for both the normal
  // hub→dungeon path and the E2E test's manual transition.
  const dungeonCtx = (id) => ({
    dungeonId: id,
    rooms,
    weapons,
    monsters,
    abilities,
    hubTransition: () => sm.transition('hub'),
  });

  const sm = new StateMachine('title', {
    title: titleScene,
    hub: hubScene,
    dungeon: dungeonScene,
    death: deathScene,
    levelup: levelupScene,
  });

  setTitleStateMachine(sm);

  setHubStateMachine(sm);
  setEnterDungeon((id) => sm.transition('dungeon', dungeonCtx(id)));

  // Mount LittleJS v1.18 with the canvas as the root element and
  // route the per-frame gameUpdate callback into our state machine.
  // LittleJS exposes the frame's delta time as the `timeDelta` export.
  engineInit(
    undefined,                              // gameInit (no async init needed)
    () => sm.update(timeDelta),             // gameUpdate
    undefined,                              // gameUpdatePost
    undefined,                              // gameRender
    undefined,                              // gameRenderPost
    [],                                     // imageSources
    canvas                                  // rootElement
  );

  // Expose for the Playwright E2E test to drive transitions.
  window.__pf = {
    db: rooms, save, sm, rooms, dungeons,
    weapons, monsters, abilities,
    transition: (s, ctx) => sm.transition(s, ctx),
    enterDungeon: (id) => sm.transition('dungeon', dungeonCtx(id)),
  };

  registerServiceWorker();

  console.log('PrinceFarmer boot OK');
}

boot().catch((err) => {
  console.error('PrinceFarmer boot failed:', err);
  throw err;
});
