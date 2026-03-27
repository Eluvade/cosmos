import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';
import { basePlanet } from '../glsl/features/base-planet.glsl.js';
import { landMass } from '../glsl/features/land-mass.glsl.js';
import { clouds } from '../glsl/features/clouds.glsl.js';
import { atmosphere } from '../glsl/features/atmosphere.glsl.js';

export const aquaticProfile: RenderProfile = {
  type: CelestialType.Aquatic,
  mode: 'composed',
  uvScaling: 1.05,
  features: [
    { feature: basePlanet, params: { uvSource: 0, octaves: 6, seedSlot: 1, colorStart: 0, noiseScale: 10 } },
    { feature: landMass,   params: { landCutoff: 0.65, seedSlot: 2, colorStart: 3, noiseScale: 10 } },
    { feature: clouds,     params: { cloudCover: 0.546, cloudScale: 4, seedSlot: 3, colorStart: 7 } },
    { feature: atmosphere, params: { colorStart: 11 } },
  ],
  palette: PALETTES[CelestialType.Aquatic],
  colorSlots: COLOR_SLOTS[CelestialType.Aquatic],
  loopLCM: LOOP_LCMS[CelestialType.Aquatic],
  defaults: { fbmOctaves: 6, noiseScale: 10, cloudCover: 0.546, cloudScale: 4, landCutoff: 0.65 },
};
