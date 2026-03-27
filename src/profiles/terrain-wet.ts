import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';
import { basePlanet } from '../glsl/features/base-planet.glsl.js';
import { landMass } from '../glsl/features/land-mass.glsl.js';
import { clouds } from '../glsl/features/clouds.glsl.js';
import { atmosphere } from '../glsl/features/atmosphere.glsl.js';

export const terrainWetProfile: RenderProfile = {
  type: CelestialType.TerrainWet,
  mode: 'composed',
  uvScaling: 1.05,
  features: [
    { feature: basePlanet, params: { uvSource: 0, octaves: 6, seedSlot: 1, colorStart: 0, noiseScale: 10 } },
    { feature: landMass,   params: { landCutoff: 0.5, seedSlot: 2, colorStart: 3, noiseScale: 10 } },
    { feature: clouds,     params: { cloudCover: 0.546, cloudScale: 4, seedSlot: 3, colorStart: 7 } },
    { feature: atmosphere, params: { colorStart: 11 } },
  ],
  palette: PALETTES[CelestialType.TerrainWet],
  colorSlots: COLOR_SLOTS[CelestialType.TerrainWet],
  loopLCM: LOOP_LCMS[CelestialType.TerrainWet],
  defaults: { fbmOctaves: 6, noiseScale: 10, cloudCover: 0.546, cloudScale: 4, landCutoff: 0.5 },
};
