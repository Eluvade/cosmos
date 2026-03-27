import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { LOOP_LCMS } from '../palettes.js';

export const nebulaProfile: RenderProfile = {
  type: CelestialType.Nebula,
  mode: 'canvas2d',
  uvScaling: 1.0,
  palette: {},
  colorSlots: [],
  loopLCM: LOOP_LCMS[CelestialType.Nebula],
  defaults: {},
};
