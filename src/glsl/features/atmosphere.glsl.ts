// ============================================================================
// Feature: Atmosphere — radial smoothstep glow rings
// Used by: TerrainWet, Aquatic
// ============================================================================

import type { ShaderFeature } from '../../types.js';

/**
 * Atmospheric glow ring extending beyond the planet surface.
 *
 * Params:
 *   colorStart — first u_col index (3 consecutive colors used)
 */
export const atmosphere: ShaderFeature = {
  id: 'atmosphere',
  seedSlots: [],
  colorSlotRange: [11, 14],
  glsl: (p) => {
    const c0 = `u_col${p.colorStart || 11}`;
    const c1 = `u_col${(p.colorStart || 11) + 1}`;
    const c2 = `u_col${(p.colorStart || 11) + 2}`;
    return `
    // === ATMOSPHERE ===
    {
        vec2 atmo_ndc = 2.0 * uv - 1.0;
        float atmo_d = length(atmo_ndc);
        vec4 atmo = mix(vec4(0.0), ${c0}, smoothstep(0.65, 0.87, atmo_d));
        atmo = mix(atmo, ${c1}, smoothstep(0.87, 0.97, atmo_d));
        atmo = mix(atmo, ${c2}, smoothstep(0.97, 1.04, atmo_d));
        atmo = mix(atmo, vec4(0.0), smoothstep(1.04, 1.05, atmo_d));
        result = alphaBlend(result, atmo);
    }`;
  },
};
