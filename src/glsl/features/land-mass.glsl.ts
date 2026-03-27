// ============================================================================
// Feature: Land Mass — multi-level FBM land with light modulation
// Used by: TerrainWet (cutoff=0.5), Aquatic (cutoff=0.65)
// ============================================================================

import type { ShaderFeature } from '../../types.js';

/**
 * Land mass layer with 4 elevation levels and light-influenced shading.
 *
 * Params:
 *   landCutoff  — step threshold for land visibility (0.5 or 0.65)
 *   seedSlot    — u_seed index
 *   colorStart  — first u_col index (4 consecutive colors used)
 *   noiseScale  — FBM noise scale (default 10)
 */
export const landMass: ShaderFeature = {
  id: 'land_mass',
  seedSlots: [2],
  colorSlotRange: [3, 7],
  glsl: (p) => {
    const cut = (p.landCutoff ?? 0.5).toFixed(4);
    const seed = `u_seed${p.seedSlot || 2}`;
    const c0 = `u_col${p.colorStart || 3}`;
    const c1 = `u_col${(p.colorStart || 3) + 1}`;
    const c2 = `u_col${(p.colorStart || 3) + 2}`;
    const c3 = `u_col${(p.colorStart || 3) + 3}`;
    const sz = (p.noiseScale || 10).toFixed(1);
    return `
    // === LAND MASS ===
    {
        float land_sz = ${sz};
        vec2 land_base = sphered * land_sz + vec2(t, 0.0);
        float lf1 = fbm_s(land_base, 6, ${seed}, land_sz);
        float lf2 = fbm_s(land_base - u_light_origin * lf1, 6, ${seed}, land_sz);
        float lf3 = fbm_s(land_base - u_light_origin * 1.5 * lf1, 6, ${seed}, land_sz);
        float lf4 = fbm_s(land_base - u_light_origin * 2.0 * lf1, 6, ${seed}, land_sz);

        float dl_mid = step(0.4, d_light);
        float dl_hi  = step(0.6, d_light);
        float dl_lo  = 1.0 - dl_mid;
        lf4 *= mix(1.0, 0.9, dl_lo);
        lf2 *= mix(1.0, 1.05, dl_mid) * mix(1.0, 1.3, dl_hi);
        lf3 *= mix(1.0, 1.05, dl_mid) * mix(1.0, 1.4, dl_hi);
        lf4 *= mix(1.0, 1.05, dl_mid) * mix(1.0, 1.8, dl_hi);

        float ld = pow(d_light, 2.0) * 0.1;
        vec4 land_col = ${c3};
        land_col = mix(land_col, ${c2}, step(lf4 + ld, lf1));
        land_col = mix(land_col, ${c1}, step(lf3 + ld, lf1));
        land_col = mix(land_col, ${c0}, step(lf2 + ld, lf1));
        float land_a = step(${cut}, lf1) * a_circle * land_col.a;
        result = alphaBlend(result, vec4(land_col.rgb, land_a));
    }`;
  },
};
