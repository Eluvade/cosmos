import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';
import { basePlanet } from '../glsl/features/base-planet.glsl.js';
import { craters } from '../glsl/features/craters.glsl.js';
import { flowLayer } from '../glsl/features/flow-layer.glsl.js';

export const moltenProfile: RenderProfile = {
  type: CelestialType.Molten,
  mode: 'composed',
  uvScaling: 1.0,
  features: [
    { feature: basePlanet, params: { uvSource: 1, octaves: 6, seedSlot: 1, colorStart: 0, noiseScale: 10 } },
    { feature: craters,    params: { craterScale: 5, seedSlot: 2, colorStart: 3 } },
    { feature: flowLayer,  params: { flowOctaves: 5, flowCutoff: 0.6, flowScale: 10, seedSlot: 3, colorStart: 5 } },
  ],
  palette: PALETTES[CelestialType.Molten],
  colorSlots: COLOR_SLOTS[CelestialType.Molten],
  loopLCM: LOOP_LCMS[CelestialType.Molten],
  defaults: { fbmOctaves: 6, noiseScale: 10, craterScale: 5, flowCutoff: 0.6, flowOctaves: 5, flowScale: 10 },
};
