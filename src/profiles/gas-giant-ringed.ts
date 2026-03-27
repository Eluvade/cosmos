import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';
import { FRAG_GAS_GIANT_RINGED } from '../glsl/standalone/gas-giant-ringed.glsl.js';

export const gasGiantRingedProfile: RenderProfile = {
  type: CelestialType.GasGiantRinged,
  mode: 'standalone',
  uvScaling: 1.0,
  standaloneGlsl: FRAG_GAS_GIANT_RINGED,
  palette: PALETTES[CelestialType.GasGiantRinged],
  colorSlots: COLOR_SLOTS[CelestialType.GasGiantRinged],
  loopLCM: LOOP_LCMS[CelestialType.GasGiantRinged],
  defaults: {},
};
