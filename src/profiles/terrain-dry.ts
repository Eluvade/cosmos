import type { RenderProfile } from '../types.js';
import { CelestialType } from '../types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from '../palettes.js';
import { FRAG_TERRAIN_DRY } from '../glsl/standalone/terrain-dry.glsl.js';

export const terrainDryProfile: RenderProfile = {
  type: CelestialType.TerrainDry,
  mode: 'standalone',
  uvScaling: 1.0,
  standaloneGlsl: FRAG_TERRAIN_DRY,
  palette: PALETTES[CelestialType.TerrainDry],
  colorSlots: COLOR_SLOTS[CelestialType.TerrainDry],
  loopLCM: LOOP_LCMS[CelestialType.TerrainDry],
  defaults: {},
};
