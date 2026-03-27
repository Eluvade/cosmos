// ============================================================================
// Standalone Shader: Star — multi-layer stellar surface with glow and rays
// 6 interdependent layers, not decomposable.
// ============================================================================

export const FRAG_STAR = `
void main() {
    vec2 raw_uv = v_pos;
    vec2 uv = (floor(raw_uv * u_pixels) / u_pixels) + 0.5;
    float t = u_time * u_time_speed;

    vec2 centered = uv - 0.5;
    float d_circle = length(centered);
    float angle = atan(centered.y, centered.x);

    // Body is shrunk so glow + rays fit inside the canvas
    float body_r = 0.28;
    float canvas_edge = 0.48;

    // Remap UVs so body fills the same [0,0.5] normalized space
    vec2 s_uv = centered / (body_r * 2.0) + 0.5;
    float s_d = distance(s_uv, vec2(0.5));

    // === RADIAL GLOW ===
    float glow_pulse = 1.0 + 0.12 * sin(t) + 0.06 * sin(t * 2.15);
    float glow_a = smoothstep(canvas_edge, body_r * 0.5, d_circle) * 0.55 * glow_pulse;
    float glow_noise = fbm_s(uv * 4.0 + vec2(t * 0.1, t * 0.075), 3, u_seed5, 4.0);
    glow_a *= 0.7 + glow_noise * 0.4;
    vec4 result = vec4(u_col5.rgb, glow_a * u_col5.a);

    // === RAYS ===
    float ang01 = angle / 6.2832 + 0.5;
    float ray_seed = noise_s(vec2(ang01 * 3.0, t * 0.15), u_seed6, 3.0);
    float ray_w1 = sin(angle * 8.0 + ray_seed * 6.0 + t * 0.5);
    ray_w1 = pow(max(ray_w1, 0.0), 3.0);
    float ray_w2 = sin(angle * 16.0 - ray_seed * 4.0 - t * 0.3);
    ray_w2 = pow(max(ray_w2, 0.0), 4.0) * 0.4;
    float ray_intensity = ray_w1 + ray_w2;

    float ray_reach = body_r + ray_intensity * (canvas_edge - body_r);
    float ray_a = smoothstep(ray_reach, ray_reach - 0.03, d_circle)
                * smoothstep(body_r - 0.01, body_r + 0.02, d_circle);
    ray_a *= 1.0 - smoothstep(body_r, ray_reach, d_circle) * 0.6;
    ray_a *= 0.5 * glow_pulse;
    result = alphaBlend(result, vec4(u_col5.rgb, ray_a * u_col5.a));

    // === THIN BRIGHT LINES ===
    float line_seed = noise_s(vec2(ang01 * 5.0, t * 0.2), u_seed6, 5.0);
    float line_w1 = sin(angle * 12.0 + line_seed * 8.0 + t * 0.7);
    line_w1 = pow(max(line_w1, 0.0), 12.0);
    float line_w2 = sin(angle * 24.0 - line_seed * 5.0 + t * 0.4);
    line_w2 = pow(max(line_w2, 0.0), 16.0) * 0.6;
    float line_intensity = line_w1 + line_w2;

    float line_reach = body_r + line_intensity * (canvas_edge - body_r);
    float line_a = smoothstep(line_reach, line_reach - 0.01, d_circle)
                 * smoothstep(body_r - 0.005, body_r + 0.01, d_circle);
    line_a *= 1.0 - smoothstep(body_r, line_reach, d_circle) * 0.4;
    line_a *= 0.85;
    vec3 line_col = mix(u_col5.rgb, u_col0.rgb, 0.7);
    result = alphaBlend(result, vec4(line_col, line_a));

    // === BLOB LAYER (corona) ===
    float blob_scale = 1.4;
    vec2 blob_uv = (s_uv - 0.5) / blob_scale + 0.5;
    vec2 blob_rot = rotate2d(blob_uv, u_rotation);
    float blob_angle = atan(blob_rot.x - 0.5, blob_rot.y - 0.5);
    float blob_d = distance(blob_uv, vec2(0.5));

    float blob_sz = 4.0;
    float blob_c = 0.0;
    for (int i = 0; i < 15; i++) {
        float r = rand_s(vec2(float(i)), u_seed3, blob_sz);
        vec2 circleUV = vec2(blob_d, blob_angle);
        blob_c += circlePattern(circleUV * blob_sz + t * 0.5 - (1.0 / max(blob_d, 0.01)) * 0.1 + r, 3.0, 1.5, u_seed3, blob_sz);
    }
    blob_c *= 0.37 - blob_d;
    blob_c = step(0.07, blob_c - blob_d);
    blob_c *= step(d_circle, canvas_edge);

    vec4 blob_col = u_col4;
    result = alphaBlend(result, vec4(blob_col.rgb, blob_c * blob_col.a));

    // === STAR SURFACE (voronoi) ===
    float star_a = step(d_circle, body_r);
    vec2 star_pix = rotate2d(s_uv, u_rotation);
    star_pix = spherify(star_pix);

    float n = cells(star_pix + vec2(t, 0.0), 10.0, 2.0);
    n *= cells(star_pix + vec2(t * 0.5, 0.0), 20.0, 2.0);
    n *= 2.0;
    n = clamp(n, 0.0, 1.0);

    float interp = floor(n * 3.0) / 3.0;
    vec4 star_col = sampleRamp4(interp, u_col0, u_col1, u_col2, u_col3);
    result = alphaBlend(result, vec4(star_col.rgb, star_a * star_col.a));

    // === FLARE LAYER ===
    float flare_scale = 1.2;
    vec2 flare_uv = (s_uv - 0.5) / flare_scale + 0.5;
    vec2 flare_rot = rotate2d(flare_uv, u_rotation);
    float flare_angle = atan(flare_rot.x - 0.5, flare_rot.y - 0.5) * 0.4;
    float flare_d = distance(flare_uv, vec2(0.5));

    float flare_sz = 2.0;
    vec2 flare_circleUV = vec2(flare_d, flare_angle);
    float fn = fbm_s(flare_circleUV * flare_sz + t * 0.5, 4, u_seed4, flare_sz);
    float fnc = circlePattern(flare_circleUV * 1.0 + t * 0.5 + fn, 2.0, 1.0, u_seed4, flare_sz);
    fnc *= 1.5;
    float fn2 = fbm_s(flare_circleUV * flare_sz + t * 0.5 + vec2(100.0, 100.0), 4, u_seed4, flare_sz);
    fnc -= fn2 * 0.1;

    float flare_a = 0.0;
    float storm_w = 0.2;
    float storm_dw = 0.07;
    float in_storm = step(fnc, 1.0 - flare_d);
    float edge_a = step(storm_w - storm_dw + flare_d, fnc);
    float full_a = step(storm_w + flare_d, fnc);
    flare_a = in_storm * max(edge_a, full_a);

    float flare_interp = floor(fn2 + fnc);
    vec4 flare_col = sampleRamp4(clamp(flare_interp, 0.0, 1.0), u_col0, u_col1, u_col2, u_col3);
    flare_a *= step(fn2 * 0.25, flare_d);
    flare_a *= step(d_circle, canvas_edge);
    result = alphaBlend(result, vec4(flare_col.rgb, flare_a * flare_col.a));

    gl_FragColor = result;
}
`;
