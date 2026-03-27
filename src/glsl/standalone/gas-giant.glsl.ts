// ============================================================================
// Standalone Shader: Gas Giant — banded gas with dark overlay
// ============================================================================

export const FRAG_GAS_GIANT = `
void main() {
    vec2 raw_uv = v_pos;
    vec2 uv = (floor(raw_uv * u_pixels) / u_pixels) + 0.5;

    float d_circle = distance(uv, vec2(0.5));
    float d_light = distance(uv, u_light_origin);
    float a_circle = step(d_circle, 0.49999);
    float t = u_time * u_time_speed;

    vec2 rotated = rotate2d(uv, u_rotation);
    vec2 sphered = spherify(rotated);

    // === BASE GAS ===
    float gas_sz = 9.0;
    vec2 gas_uv = sphered;
    float cn_base = 0.0;
    for (int j = 0; j < 9; j++) {
        cn_base += circleNoise_s(gas_uv * gas_sz * 0.3 + float(j + 1) + 10.0 + vec2(t, 0.0), u_seed1, gas_sz);
    }
    float gas_c = fbm_s(gas_uv * gas_sz + cn_base + vec2(t, 0.0), 5, u_seed1, gas_sz);

    vec4 gas_col = u_col0;
    gas_col = mix(gas_col, u_col1, step(gas_c, 0.03));
    gas_col = mix(gas_col, u_col2, step(0.4, d_light + gas_c * 0.2));
    gas_col = mix(gas_col, u_col3, step(0.6, d_light + gas_c * 0.2));
    vec4 result = vec4(gas_col.rgb, a_circle * gas_col.a);

    // === DARK GAS OVERLAY ===
    vec2 gas2_uv = sphered;
    gas2_uv.y += smoothstep(0.0, 1.3, abs(gas2_uv.x - 0.4));
    float cn_dark = 0.0;
    for (int j = 0; j < 9; j++) {
        cn_dark += circleNoise_s(gas2_uv * gas_sz * 0.3 + float(j + 1) + 10.0 + vec2(t, 0.0), u_seed2, gas_sz);
    }
    float gas2_c = fbm_s(gas2_uv * gas_sz + cn_dark + vec2(t, 0.0), 5, u_seed2, gas_sz);

    float cloud_cover = 0.538;
    vec4 gas2_col = u_col4;
    gas2_col = mix(gas2_col, u_col5, step(gas2_c, cloud_cover + 0.03));
    gas2_col = mix(gas2_col, u_col6, step(0.4, d_light + gas2_c * 0.2));
    gas2_col = mix(gas2_col, u_col7, step(0.6, d_light + gas2_c * 0.2));
    float gas2_a = step(cloud_cover, gas2_c) * a_circle * gas2_col.a;
    result = alphaBlend(result, vec4(gas2_col.rgb, gas2_a));

    gl_FragColor = result;
}
`;
