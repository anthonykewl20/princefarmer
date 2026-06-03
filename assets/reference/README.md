# Style Anchors

This directory holds **style anchor images** — high-resolution reference art
that the asset generation pipeline uses to keep pixel-art output visually
consistent and on-theme.

## How style anchors are used

- **PixelLab.ai prompts** reference these images via `--style-anchor` so that
  all generated sprites (hero, monsters, weapons, environment) share a
  unified visual language.
- **Human reviewers** compare generated sprites against the anchor during the
  M0 → M1 style iteration loop (`npm run gen-assets -- --test-pack`).

## Files

| File | What it anchors |
|------|-----------------|
| `lakan-alon-style-anchor.png` | The hero character (Lakan Alon) and 5 melee weapons (3 kampilans, spear, round shield, dagger). Used as the visual baseline for all hero and weapon sprites. |

## Source provenance

`lakan-alon-style-anchor.png` is original concept art provided by the
project owner. It is **not** pixel art itself — it's a high-resolution
reference that the PixelLab pipeline will translate into pixel art.

The game renders in pixel art (modern pixel, Celeste / Dead Cells style —
see `docs/superpowers/specs/2026-06-03-princefarmer-design.md` §3). The
anchor provides:

- **Character design** — bare-chested Filipino warrior, red headband,
  tribal tattoos, gold jewelry, red-and-white wrap, bare feet
- **Color palette** — warm earth tones (browns, reds, golds) against
  darker backgrounds
- **Weapon silhouettes** — 3 kampilan (curved single-edged swords),
  one spear, one round shield with red tassels, one dagger
- **Cultural cues** — pre-colonial Filipino warrior aesthetic that
  carries through to all hero and weapon sprites
