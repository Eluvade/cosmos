import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';
import { FRAG_GAS_GIANT } from '../glsl/standalone/gas-giant.glsl.js';

export const gasGiantProfile: RenderProfile = {
  type: CelestialType.GasGiant,
  mode: 'standalone',
  uvScaling: 1.0,
  standaloneGlsl: FRAG_GAS_GIANT,
  palette: PALETTES[CelestialType.GasGiant],
  colorSlots: COLOR_SLOTS[CelestialType.GasGiant],
  loopLCM: LOOP_LCMS[CelestialType.GasGiant],
  defaults: {},
};
