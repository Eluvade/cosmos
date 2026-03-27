import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';
import { FRAG_STAR } from '../glsl/standalone/star.glsl.js';

export const starProfile: RenderProfile = {
  type: CelestialType.Star,
  mode: 'standalone',
  uvScaling: 1.0,
  standaloneGlsl: FRAG_STAR,
  palette: PALETTES[CelestialType.Star],
  colorSlots: COLOR_SLOTS[CelestialType.Star],
  loopLCM: LOOP_LCMS[CelestialType.Star],
  defaults: {},
};
