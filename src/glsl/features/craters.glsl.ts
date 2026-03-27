// ============================================================================
// Feature: Craters — circleCrater_s double-pass with light offset
// Used by: Barren, Molten
// ============================================================================

import type { ShaderFeature } from '../../types.js';

/**
 * Crater layer with two circleCrater passes and light-influenced shadow.
 *
 * Params:
 *   craterScale — noise scale (default 5)
 *   seedSlot    — u_seed index
 *   colorStart  — first u_col index (2 consecutive colors used)
 */
export const craters: ShaderFeature = {
  id: 'craters',
  seedSlots: [2],
  colorSlotRange: [3, 5],
  glsl: (p) => {
    const sz = (p.craterScale || 5).toFixed(1);
    const seed = `u_seed${p.seedSlot || 2}`;
    const c0 = `u_col${p.colorStart || 3}`;
    const c1 = `u_col${(p.colorStart || 3) + 1}`;
    return `
    // === CRATER LAYER ===
    {
        float crater_sz = ${sz};
        float c1_val = 1.0;
        for (int i = 0; i < 2; i++) {
            c1_val *= circleCrater_s(sphered * crater_sz + float(i + 1) + 10.0 + vec2(t, 0.0), ${seed}, crater_sz);
        }
        float crater1 = 1.0 - c1_val;

        float c2_val = 1.0;
        vec2 c2_off = (u_light_origin - 0.5) * 0.04;
        for (int i = 0; i < 2; i++) {
            c2_val *= circleCrater_s((sphered + c2_off) * crater_sz + float(i + 1) + 10.0 + vec2(t, 0.0), ${seed}, crater_sz);
        }
        float crater2 = 1.0 - c2_val;

        vec4 crater_col = ${c0};
        float crater_a = step(0.5, crater1) * a_circle;
        crater_col = mix(crater_col, ${c1}, step(crater2, crater1 - (0.5 - d_light) * 2.0));
        crater_col = mix(crater_col, ${c1}, step(0.4, d_light));
        crater_a *= step(d_circle, 0.5);
        result = alphaBlend(result, vec4(crater_col.rgb, crater_a * crater_col.a));
    }`;
  },
};
