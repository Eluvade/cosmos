// ============================================================================
// Shader Composer — assembles feature snippets into a complete fragment shader
// ============================================================================

import { GLSL_HEADER } from './header.glsl.js';
import { GLSL_COMMON } from './common.glsl.js';
import type { BoundFeature } from '../types.js';

/**
 * Compose a complete fragment shader from an ordered list of features.
 *
 * @param features  Ordered feature list (rendered bottom-to-top via alphaBlend).
 * @param uvScaling UV scaling factor applied after pixelation (1.05 for atmosphere types).
 * @returns Complete GLSL fragment shader source.
 */
export function composeShader(features: BoundFeature[], uvScaling: number): string {
  const uvScaleLine = uvScaling !== 1.0
    ? `    uv = (uv - 0.5) * ${uvScaling.toFixed(4)} + 0.5;\n`
    : '';

  const featureSnippets = features
    .map(bf => bf.feature.glsl(bf.params))
    .join('\n');

  return GLSL_HEADER + GLSL_COMMON + `
void main() {
    vec2 raw_uv = v_pos;
    vec2 uv = (floor(raw_uv * u_pixels) / u_pixels) + 0.5;
${uvScaleLine}
    float d_circle = distance(uv, vec2(0.5));
    float d_light = distance(uv, u_light_origin);
    float a_circle = step(d_circle, 0.49999);
    float t = u_time * u_time_speed;

    vec2 rotated = rotate2d(uv, u_rotation);
    vec2 sphered = spherify(rotated);

    vec4 result = vec4(0.0);

${featureSnippets}

    gl_FragColor = result;
}
`;
}

/**
 * Build a complete fragment shader from a standalone GLSL main() body.
 * Used for types too unique to decompose into features.
 *
 * @param mainBody Complete `void main() { ... }` GLSL source.
 * @returns Complete GLSL fragment shader source.
 */
export function standaloneShader(mainBody: string): string {
  return GLSL_HEADER + GLSL_COMMON + mainBody;
}
