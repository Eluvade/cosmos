// ============================================================================
// Feature: Base Planet — 3-color light-stepped surface
// Used by: TerrainWet, Aquatic, Barren, Molten, Ice
// ============================================================================

import type { ShaderFeature } from '../../types.js';

/**
 * Base planet surface with FBM noise and 3-level light darkening.
 *
 * Params:
 *   uvSource  — 0 = rotated, 1 = sphered (Molten uses sphered)
 *   octaves   — FBM octave count (default 6)
 *   seedSlot  — u_seed index (1-6)
 *   colorStart — first u_col index (3 consecutive colors used)
 */
export const basePlanet: ShaderFeature = {
  id: 'base_planet',
  seedSlots: [1],
  colorSlotRange: [0, 3],
  glsl: (p) => {
    const uv = p.uvSource === 1 ? 'sphered' : 'rotated';
    const oct = p.octaves || 6;
    const seed = `u_seed${p.seedSlot || 1}`;
    const c0 = `u_col${p.colorStart || 0}`;
    const c1 = `u_col${(p.colorStart || 0) + 1}`;
    const c2 = `u_col${(p.colorStart || 0) + 2}`;
    return `
    // === BASE PLANET ===
    {
        float base_sz = ${(p.noiseScale || 10).toFixed(1)};
        float base_fbm1 = fbm_s(${uv}, ${oct}, ${seed}, base_sz);
        float base_dl = d_light + fbm_s(${uv} * base_sz + base_fbm1 + vec2(t, 0.0), ${oct}, ${seed}, base_sz) * 0.1;

        vec4 base_col = mix(${c0}, ${c1}, step(0.4, base_dl));
        base_col = mix(base_col, ${c2}, step(0.6, base_dl));
        result = vec4(base_col.rgb, a_circle * base_col.a);
    }`;
  },
};
