import manifest from '../../tools/asset-gen/manifest.json';

const SPRITE_GLOB = import.meta.glob('../../assets/sprites/**/*.{png,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const SPRITE_FILE_TO_URL = Object.fromEntries(
  Object.entries(SPRITE_GLOB).map(([path, url]) => [
    path.replace(/^\.\.\/\.\.\//, ''),
    url,
  ])
);

const SPRITE_DEFS = manifest.assets.map((asset) => ({
  ...asset,
  src: SPRITE_FILE_TO_URL[asset.file] ?? `/${asset.file}`,
}));

let littlejsRuntime = null;

const SPRITE_SOURCES = (() => {
  const seen = new Set();
  const sources = [];
  for (const entry of SPRITE_DEFS) {
    const shouldLoad = entry.status === 'done' || Boolean(SPRITE_FILE_TO_URL[entry.file]);
    if (!shouldLoad) continue;
    if (seen.has(entry.src)) continue;
    seen.add(entry.src);
    sources.push(entry.src);
  }
  return sources;
})();

const HERO_ANIMATION_DEFS = {
  idle: { frames: 4, fps: 6 },
  run: { frames: 6, fps: 12 },
  jump: { frames: 2, fps: 6 },
  climb: { frames: 2, fps: 8 },
  hurt: { frames: 1, fps: 1 },
  death: { frames: 4, fps: 6 },
};

function pickHeroFrame(player) {
  const state = player?.animState || 'idle';
  const info = HERO_ANIMATION_DEFS[state] ?? HERO_ANIMATION_DEFS.idle;
  const maxFrame = info.frames;
  const timer = player?.animTimer ?? 0;
  return Math.floor(timer * info.fps) % maxFrame;
}

function getVec2(littlejs, x, y) {
  return littlejs?.vec2 ? littlejs.vec2(x, y) : { x, y };
}

function asDrawableWorldVec(littlejs, x, y) {
  return getVec2(littlejs, x, y);
}

function drawSprite(littlejs, position, spriteDef, mirror = false) {
  if (!spriteDef?.tileInfo) return false;
  if (typeof littlejs?.drawTile !== 'function' || typeof littlejs?.WHITE === 'undefined') return false;

  const worldWidth = spriteDef.size[0] / 16;
  const worldHeight = spriteDef.size[1] / 16;
  const drawPos = asDrawableWorldVec(littlejs, position.x - worldWidth / 2, position.y - worldHeight);

  littlejs.drawTile(
    asDrawableWorldVec(littlejs, drawPos.x, drawPos.y),
    asDrawableWorldVec(littlejs, worldWidth, worldHeight),
    spriteDef.tileInfo,
    littlejs.WHITE,
    0,
    mirror
  );
  return true;
}

let cachedSpriteBank = null;

function resolveRuntime(littlejs) {
  return littlejs || littlejsRuntime || null;
}

function buildSpriteBank(littlejs) {
  const runtime = resolveRuntime(littlejs);
  const spriteBank = new Map();
  const sourceToIndex = new Map(SPRITE_SOURCES.map((source, index) => [source, index]));

  for (const def of SPRITE_DEFS) {
    const index = sourceToIndex.get(def.src);
    const textureInfo = typeof index === 'number' ? runtime?.textureInfos?.[index] : null;
    if (!textureInfo || !textureInfo.size || textureInfo.size.x <= 0 || textureInfo.size.y <= 0) {
      spriteBank.set(def.id, null);
      continue;
    }
    if (!runtime?.TileInfo || !runtime?.vec2) {
      spriteBank.set(def.id, null);
      continue;
    }

    const size = asDrawableWorldVec(runtime, def.size[0], def.size[1]);
    spriteBank.set(def.id, {
      tileInfo: new runtime.TileInfo(asDrawableWorldVec(runtime, 0, 0), size, textureInfo, 0, 0),
      size: [def.size[0], def.size[1]],
    });
  }

  cachedSpriteBank = spriteBank;
  return spriteBank;
}

export function getSpriteSources() {
  return [...SPRITE_SOURCES];
}

export function getSpriteBank() {
  return cachedSpriteBank;
}

export function refreshSpriteBank(littlejs) {
  return buildSpriteBank(resolveRuntime(littlejs));
}

export function setSpriteRuntime(littlejs) {
  littlejsRuntime = littlejs || null;
  cachedSpriteBank = null;
  return littlejsRuntime;
}

export function renderHeroSprite(ctx, player, spriteBank = getSpriteBank(), littlejs = null) {
  const runtime = resolveRuntime(littlejs);
  const state = player?.animState || 'idle';
  const frame = pickHeroFrame(player);
  const key = `hero/${state}/${frame}`;
  const spriteDef = spriteBank?.get(key);
  const mirror = (player?.facing ?? 1) < 0;
  return spriteDef && runtime ? drawSprite(runtime, player, spriteDef, mirror) : false;
}

export function renderMonsterSprite(ctx, monster, spriteBank = getSpriteBank(), littlejs = null) {
  const runtime = resolveRuntime(littlejs);
  const action = monster?.action || 'idle';
  const key = `monsters/${monster?.id || 'unknown'}/${action}/0`;
  const spriteDef = spriteBank?.get(key);
  const mirror = (monster?.facing ?? 1) < 0;
  return spriteDef && runtime ? drawSprite(runtime, monster, spriteDef, mirror) : false;
}

export function isSpriteAvailable(key, spriteBank = getSpriteBank()) {
  return !!(spriteBank?.get(key));
}
