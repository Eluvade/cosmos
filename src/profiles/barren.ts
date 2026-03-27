import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';
import { basePlanet } from '../glsl/features/base-planet.glsl.js';
import { craters } from '../glsl/features/craters.glsl.js';

export const barrenProfile: RenderProfile = {
  type: CelestialType.Barren,
  mode: 'composed',
  uvScaling: 1.0,
  features: [
    { feature: basePlanet, params: { uvSource: 0, octaves: 6, seedSlot: 1, colorStart: 0, noiseScale: 10 } },
    { feature: craters,    params: { craterScale: 5, seedSlot: 2, colorStart: 3 } },
  ],
  palette: PALETTES[CelestialType.Barren],
  colorSlots: COLOR_SLOTS[CelestialType.Barren],
  loopLCM: LOOP_LCMS[CelestialType.Barren],
  defaults: { fbmOctaves: 6, noiseScale: 10, craterScale: 5 },
};
