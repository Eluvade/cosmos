// ============================================================================
// Feature: Cloud Layer — circleNoise + FBM clouds
// Used by: TerrainWet, Aquatic, Ice
// ============================================================================

import type { ShaderFeature } from '../../types.js';

/**
 * Cloud layer with circle noise and FBM, light-stepped coloring.
 *
 * Params:
 *   cloudCover — cloud cover threshold 0-1 (default 0.546)
 *   cloudScale — noise scale (default 4)
 *   seedSlot   — u_seed index
 *   colorStart — first u_col index (4 consecutive colors used)
 */
export const clouds: ShaderFeature = {
  id: 'clouds',
  seedSlots: [3],
  colorSlotRange: [7, 11],
  glsl: (p) => {
    const cc = (p.cloudCover ?? 0.546).toFixed(4);
    const sz = (p.cloudScale || 4).toFixed(1);
    const seed = `u_seed${p.seedSlot || 3}`;
    const c0 = `u_col${p.colorStart || 7}`;
    const c1 = `u_col${(p.colorStart || 7) + 1}`;
    const c2 = `u_col${(p.colorStart || 7) + 2}`;
    const c3 = `u_col${(p.colorStart || 7) + 3}`;
    return `
    // === CLOUD LAYER ===
    {
        float cloud_sz = ${sz};
        vec2 cloud_uv = sphered;
        cloud_uv.y += smoothstep(0.0, 1.3, abs(cloud_uv.x - 0.4));
        cloud_uv *= vec2(1.0, 2.5);

        float c_noise = 0.0;
        for (int j = 0; j < 9; j++) {
            c_noise += circleNoise_s(cloud_uv * cloud_sz * 0.3 + float(j + 1) + 10.0 + vec2(t, 0.0), ${seed}, cloud_sz);
        }
        float cloud_c = fbm_s(cloud_uv * cloud_sz + c_noise + vec2(t, 0.0), 4, ${seed}, cloud_sz);

        float cloud_cover = ${cc};
        vec4 cloud_col = ${c0};
        cloud_col = mix(cloud_col, ${c1}, step(cloud_c, cloud_cover + 0.03));
        cloud_col = mix(cloud_col, ${c2}, step(0.4, d_light + cloud_c * 0.2));
        cloud_col = mix(cloud_col, ${c3}, step(0.6, d_light + cloud_c * 0.2));
        float cloud_d = distance(uv, vec2(0.5));
        cloud_c *= step(cloud_d, 0.5);
        float cloud_a = step(cloud_cover, cloud_c) * a_circle * cloud_col.a;
        result = alphaBlend(result, vec4(cloud_col.rgb, cloud_a));
    }`;
  },
};
