// ============================================================================
// Standalone Shader: Gas Giant Ringed — banded body + perspective ring
// ============================================================================

export const FRAG_GAS_GIANT_RINGED = `
void main() {
    vec2 raw_uv = v_pos;
    vec2 uv = (floor(raw_uv * u_pixels) / u_pixels) + 0.5;
    float t = u_time * u_time_speed;

    // Planet body at 50% scale to leave room for ring
    float body_scale = 2.0;
    vec2 body_raw = v_pos * body_scale;
    vec2 body_uv = (floor(body_raw * u_pixels) / u_pixels) + 0.5;

    float body_d_circle = distance(body_uv, vec2(0.5));
    float body_a = step(body_d_circle, 0.49999);
    float body_d_light = distance(body_uv, u_light_origin);

    vec2 body_rotated = rotate2d(body_uv, u_rotation);
    vec2 body_sphered = spherify(body_rotated);

    // === DENSE GAS PLANET ===
    float gas_sz = 15.0;
    float band = fbm_w(vec2(0.0, body_sphered.y * gas_sz), 6, u_seed1, gas_sz);
    float turb = 0.0;
    for (int j = 0; j < 10; j++) {
        turb += circleNoise_w(body_sphered * gas_sz * 0.3 + float(j + 1) + 10.0 + vec2(t, 0.0), u_seed1, gas_sz);
    }

    float gf1 = fbm_w(body_sphered * gas_sz, 6, u_seed1, gas_sz);
    float gf2 = fbm_w(body_sphered * vec2(1.0, 2.0) * gas_sz + gf1 + vec2(-t, 0.0) + turb, 6, u_seed1, gas_sz);
    gf2 *= pow(band, 2.0) * 7.0;
    float light = gf2 + body_d_light * 1.8;
    gf2 += pow(body_d_light, 1.0) - 0.3;
    gf2 = smoothstep(-0.2, 4.0 - gf2, light);

    float posterized = floor(gf2 * 4.0) / 2.0;
    vec4 gas_col = mix(
        sampleRamp4(posterized, u_col0, u_col1, u_col2, u_col3),
        sampleRamp4(posterized - 1.0, u_col4, u_col5, u_col6, u_col7),
        step(0.625, gf2)
    );
    vec4 result = vec4(gas_col.rgb, body_a * gas_col.a);

    // === RING LAYER ===
    float ring_sz = 25.0;
    float ring_width = 0.143;
    float ring_perspective = 6.0;
    float scale_planet = 4.0;

    vec2 ring_uv = rotate2d(uv, u_rotation);
    vec2 ring_center = ring_uv - vec2(0.0, 0.5);
    ring_center *= vec2(1.0, ring_perspective);
    float center_d = distance(ring_center, vec2(0.5, 0.0));

    float ring = smoothstep(0.5 - ring_width * 2.0, 0.5 - ring_width, center_d);
    ring *= smoothstep(center_d - ring_width, center_d, 0.4);

    // Hide ring behind planet in upper half
    float behind = step(ring_uv.y, 0.5) * (1.0 - step(1.0 / scale_planet, distance(ring_uv, vec2(0.5))));
    ring *= 1.0 - behind;

    // Ring material noise
    vec2 ring_mat_uv = rotate2d(ring_center + vec2(0.0, 0.5), t);
    ring *= fbm_w(ring_mat_uv * ring_sz, 8, u_seed2, ring_sz);

    float ring_posterized = floor((ring + pow(body_d_light, 2.0) * 2.0) * 4.0) / 4.0;
    vec4 ring_col = mix(
        sampleRamp4(ring_posterized, u_col8, u_col9, u_col10, u_col11),
        sampleRamp4(ring_posterized - 1.0, u_col8, u_col9, u_col10, u_col11),
        step(1.0, ring_posterized)
    );
    float ring_a = step(0.28, ring);
    result = alphaBlend(result, vec4(ring_col.rgb, ring_a * ring_col.a));

    gl_FragColor = result;
}
`;
