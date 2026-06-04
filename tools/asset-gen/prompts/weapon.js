/**
 * Weapon sprite prompt templates (M2: kampilan).
 *
 * M2 ships one weapon — the kampilan, a Filipino curved single-edged
 * sword with an ornate hilt. The hero holds it; the sprite is rendered
 * in the hero's grip from a side view.
 *
 * Animations cover idle (held) and swing (active attack frame).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const styleGuide = JSON.parse(readFileSync(join(__dirname, '..', 'style-guide.json'), 'utf8'));

const ANIM_DESCRIPTIONS = {
  idle: 'held loosely at the hero\'s side, blade angled down, ornate hilt visible',
  swing: 'mid-swing, blade arcing forward at chest height, motion-blur trail at the tip',
  lunge: 'thrusting forward, blade extended ahead of the hero, hilt gripped with both hands',
};

/**
 * Kampilan-specific base description: curved single-edged sword with
 * an elaborate hilt and brass pommel, wooden grip wrapped in cord.
 */
const KAMPILAN_BASE = 'Filipino kampilan curved single-edged sword, ornate hilt with brass pommel, wooden grip wrapped in cord, dramatic curve';

/**
 * Build a prompt for a kampilan animation frame.
 * @param {string} anim - one of: idle, swing, lunge
 * @param {number} frame - 0-based frame index
 * @returns {string} the prompt
 */
export function kampilanPrompt(anim, frame) {
  const desc = ANIM_DESCRIPTIONS[anim] ?? ANIM_DESCRIPTIONS.idle;
  return [
    styleGuide.basePrompt,
    styleGuide.weaponNotes,
    `${KAMPILAN_BASE}`,
    `pose: ${desc}`,
    `frame ${frame + 1} of animation cycle`,
    'centered in frame, side view, no background, transparent png',
  ].join(', ');
}

export const KAMPILAN_ANIMS = Object.keys(ANIM_DESCRIPTIONS);
