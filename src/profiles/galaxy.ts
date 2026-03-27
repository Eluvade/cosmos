import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';
import { FRAG_GALAXY } from '../glsl/standalone/galaxy.glsl.js';

export const galaxyProfile: RenderProfile = {
  type: CelestialType.Galaxy,
  mode: 'standalone',
  uvScaling: 1.0,
  standaloneGlsl: FRAG_GALAXY,
  palette: PALETTES[CelestialType.Galaxy],
  colorSlots: COLOR_SLOTS[CelestialType.Galaxy],
  loopLCM: LOOP_LCMS[CelestialType.Galaxy],
  defaults: {},
};
