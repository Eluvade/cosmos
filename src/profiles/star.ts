import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';
import { FRAG_STAR } from '../glsl/standalone/star.glsl.js';
import { starPalette } from '../star-palette.js';

export const starProfile: RenderProfile = {
  type: CelestialType.Star,
  mode: 'standalone',
  uvScaling: 1.0,
  standaloneGlsl: FRAG_STAR,
  palette: PALETTES[CelestialType.Star],
  seededPalette: starPalette,
  colorSlots: COLOR_SLOTS[CelestialType.Star],
  loopLCM: LOOP_LCMS[CelestialType.Star],
  // Full range by default: a star's colour *is* its temperature, and the
  // reference palette is one K-type sample rather than an approved design.
  defaults: { colorVariation: 1.0 },
};
