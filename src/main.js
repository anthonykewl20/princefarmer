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
import { GameDB } from './engine/gamedb.js';
import { SaveManager } from './persistence/save.js';
import { StateMachine } from './scenes/state-machine.js';
import { titleScene } from './scenes/title.js';
import { hubScene } from './scenes/hub.js';
import { dungeonScene } from './scenes/dungeon.js';
import { registerServiceWorker } from './sw-register.js';

const canvas = document.getElementById('game-canvas');
if (!canvas) throw new Error('game-canvas not found in DOM');

/** Loads all JSON files in /data and registers them into the GameDB. */
async function loadContent() {
  return new GameDB();
}

async function boot() {
  const db = await loadContent();
  const save = new SaveManager('princefarmer-save');
  await save._ready();

  const sm = new StateMachine('title', {
    title: titleScene,
    hub: hubScene,
    dungeon: dungeonScene,
  });

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
  window.__pf = { db, save, sm, transition: (s) => sm.transition(s) };

  registerServiceWorker();

  console.log('PrinceFarmer boot OK');
}

boot().catch((err) => {
  console.error('PrinceFarmer boot failed:', err);
  throw err;
});
