import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';
import { basePlanet } from '../glsl/features/base-planet.glsl.js';
import { flowLayer } from '../glsl/features/flow-layer.glsl.js';
import { clouds } from '../glsl/features/clouds.glsl.js';

export const iceProfile: RenderProfile = {
  type: CelestialType.Ice,
  mode: 'composed',
  uvScaling: 1.0,
  features: [
    { feature: basePlanet, params: { uvSource: 0, octaves: 6, seedSlot: 1, colorStart: 0, noiseScale: 10 } },
    { feature: flowLayer,  params: { flowOctaves: 4, flowCutoff: 0.6, flowScale: 10, seedSlot: 2, colorStart: 3 } },
    { feature: clouds,     params: { cloudCover: 0.546, cloudScale: 4, seedSlot: 3, colorStart: 6 } },
  ],
  palette: PALETTES[CelestialType.Ice],
  colorSlots: COLOR_SLOTS[CelestialType.Ice],
  loopLCM: LOOP_LCMS[CelestialType.Ice],
  defaults: { fbmOctaves: 6, noiseScale: 10, cloudCover: 0.546, cloudScale: 4, flowCutoff: 0.6, flowOctaves: 4, flowScale: 10 },
};
