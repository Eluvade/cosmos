import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';

export const blackHoleProfile: RenderProfile = {
  type: CelestialType.BlackHole,
  mode: 'multipass',
  uvScaling: 1.0,
  palette: PALETTES[CelestialType.BlackHole],
  colorSlots: COLOR_SLOTS[CelestialType.BlackHole],
  loopLCM: LOOP_LCMS[CelestialType.BlackHole],
  defaults: {},
};
