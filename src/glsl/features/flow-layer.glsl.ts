// ============================================================================
// Feature: Flow Layer — FBM_w cutoff for lava rivers or frozen lakes
// Used by: Molten (oct=5), Ice (oct=4)
// ============================================================================

import type { ShaderFeature } from '../../types.js';

/**
 * Flow layer (lava rivers or frozen lakes) using wide-wrap FBM.
 *
 * Params:
 *   flowOctaves — FBM octave count (5 for molten, 4 for ice)
 *   flowCutoff  — step threshold (default 0.6)
 *   flowScale   — noise scale (default 10)
 *   seedSlot    — u_seed index
 *   colorStart  — first u_col index (3 consecutive colors used)
 *   useSphered  — 1 to use sphered UV, 0 to use rotated (Molten=sphered, Ice uses sphered via base)
 */
export const flowLayer: ShaderFeature = {
  id: 'flow_layer',
  seedSlots: [2, 3],
  colorSlotRange: [3, 6],
  glsl: (p) => {
    const oct = p.flowOctaves || 5;
    const cut = (p.flowCutoff ?? 0.6).toFixed(4);
    const sz = (p.flowScale || 10).toFixed(1);
    const seed = `u_seed${p.seedSlot || 3}`;
    const c0 = `u_col${p.colorStart || 5}`;
    const c1 = `u_col${(p.colorStart || 5) + 1}`;
    const c2 = `u_col${(p.colorStart || 5) + 2}`;
    const scroll = p.useScroll === 1 ? 'vec2(t, 0.0)' : 'vec2(t, 0.0)';
    return `
    // === FLOW LAYER ===
    {
        float flow_sz = ${sz};
        float flow_cutoff = ${cut};
        float rf1 = fbm_w(sphered * flow_sz + vec2(t, 0.0), ${oct}, ${seed}, flow_sz);
        float river = fbm_w(sphered + vec2(t, 0.0) + rf1 * 2.5, ${oct}, ${seed}, flow_sz);
        river = step(flow_cutoff, river);

        vec4 flow_col = ${c0};
        flow_col = mix(flow_col, ${c1}, step(0.4, d_light));
        flow_col = mix(flow_col, ${c2}, step(0.6, d_light));
        float flow_a = river * a_circle * flow_col.a;
        result = alphaBlend(result, vec4(flow_col.rgb, flow_a));
    }`;
  },
};
