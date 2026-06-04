#!/usr/bin/env node
/**
 * PixelLab.ai asset generation CLI.
 *
 * Modes:
 *   node gen.js                    # generate all missing assets in manifest
 *   node gen.js --type=hero        # only hero assets
 *   node gen.js --id=hero/idle/0   # only one asset
 *   node gen.js --dry-run          # show what would be generated
 *
 * Requires PIXELLAB_API_KEY env var. Set to the bearer token used in
 * `claude mcp add pixellab https://api.pixellab.ai/mcp -t http -H
 * "Authorization: Bearer <key>"`.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { heroPrompt } from './prompts/hero.js';
import { aswangPrompt } from './prompts/monster.js';
import { kampilanPrompt } from './prompts/weapon.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MANIFEST_PATH = join(__dirname, 'manifest.json');
const STYLE_GUIDE_PATH = join(__dirname, 'style-guide.json');

const API_BASE = 'https://api.pixellab.ai/v1';

function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function saveManifest(m) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2));
}

function parseArgs(argv) {
  const args = { type: null, id: null, dryRun: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--type=')) args.type = arg.slice(7);
    else if (arg.startsWith('--id=')) args.id = arg.slice(5);
  }
  return args;
}

function filterAssets(manifest, args) {
  return manifest.assets.filter((a) => {
    if (a.status === 'done') return false;
    if (args.type && a.type !== args.type) return false;
    if (args.id && a.id !== args.id) return false;
    return true;
  });
}

async function callPixelLab(prompt, size, styleAnchorPath) {
  const apiKey = process.env.PIXELLAB_API_KEY;
  if (!apiKey) throw new Error('PIXELLAB_API_KEY env var is required');

  // The PixelLab API can't reach the local filesystem, so if a style
  // anchor is configured we read it and inline it as a data URL.
  // The path in style-guide.json is relative to the project root, so
  // resolve it from __dirname (this script lives at tools/asset-gen/).
  let styleAnchorBase64 = null;
  if (styleAnchorPath) {
    const fullPath = join(__dirname, '..', '..', styleAnchorPath);
    if (existsSync(fullPath)) {
      const ext = fullPath.split('.').pop().toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      styleAnchorBase64 = `data:${mime};base64,${readFileSync(fullPath).toString('base64')}`;
    } else {
      console.warn(`  style anchor not found at ${fullPath}, continuing without it`);
    }
  }

  // The exact endpoint/payload will be confirmed during M1.9 (test sprite).
  // This is the v1 starter: a basic image generation call.
  const res = await fetch(`${API_BASE}/generate-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      width: size[0],
      height: size[1],
      style_anchor: styleAnchorBase64,
    }),
  });
  if (!res.ok) {
    throw new Error(`PixelLab API error ${res.status}: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function buildPrompt(asset) {
  // Parse anim + frame from the id (e.g. "hero/idle/0", "monsters/aswang/lunge/0")
  const segments = asset.id.split('/');
  if (asset.type === 'hero') {
    const [, anim, frameStr] = segments;
    return heroPrompt(anim, parseInt(frameStr, 10));
  }
  if (asset.type === 'monster') {
    const [, monsterId, anim, frameStr] = segments;
    if (monsterId !== 'aswang') {
      throw new Error(`No prompt builder for monster "${monsterId}"`);
    }
    return aswangPrompt(anim, parseInt(frameStr, 10));
  }
  if (asset.type === 'weapon') {
    const [, weaponId, anim, frameStr] = segments;
    if (weaponId !== 'kampilan') {
      throw new Error(`No prompt builder for weapon "${weaponId}"`);
    }
    return kampilanPrompt(anim, parseInt(frameStr, 10));
  }
  throw new Error(`No prompt builder for asset type "${asset.type}"`);
}

async function main() {
  const args = parseArgs(process.argv);
  const styleGuide = JSON.parse(readFileSync(STYLE_GUIDE_PATH, 'utf8'));
  const manifest = loadManifest();
  const targets = filterAssets(manifest, args);

  console.log(`Found ${targets.length} assets to generate.`);
  if (args.dryRun) {
    for (const a of targets) console.log(`  - ${a.id} (${a.size.join('x')}) → ${a.file}`);
    return;
  }

  let generated = 0;
  for (const asset of targets) {
    const prompt = await buildPrompt(asset);
    console.log(`[${++generated}/${targets.length}] Generating ${asset.id}...`);
    try {
      const buf = await callPixelLab(prompt, asset.size, styleGuide.styleAnchor);
      const outPath = join(ROOT, asset.file);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, buf);
      asset.status = 'done';
      saveManifest(manifest);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
    }
  }
  console.log(`Done. ${generated} attempted, ${manifest.assets.filter((a) => a.status === 'done').length} total done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
