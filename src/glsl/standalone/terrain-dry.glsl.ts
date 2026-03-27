// ============================================================================
// Standalone Shader: Terrain Dry — posterized arid surface
// Unique UV ordering (spherify before rotate), not decomposable.
// ============================================================================

export const FRAG_TERRAIN_DRY = `
void main() {
    vec2 raw_uv = v_pos;
    vec2 uv = (floor(raw_uv * u_pixels) / u_pixels) + 0.5;

    float d_circle = distance(uv, vec2(0.5));
    float a = step(d_circle, 0.49999);
    float t = u_time * u_time_speed;

    vec2 suv = spherify(uv);
    float d_light = distance(suv, u_light_origin);
    suv = rotate2d(suv, u_rotation);

    float sz = 10.0;
    float f = fbm_s(suv * sz + vec2(t, 0.0), 4, u_seed1, sz);

    d_light = smoothstep(-0.3, 1.2, d_light);
    d_light *= mix(1.0, 0.9, step(d_light, 0.362));
    d_light *= mix(1.0, 0.9, step(d_light, 0.525));

    float c = d_light * pow(f, 0.8) * 3.5;
    float posterize = floor(c * 4.0) / 4.0;
    vec4 col = sampleRamp4(posterize, u_col0, u_col1, u_col2, u_col3);

    gl_FragColor = vec4(col.rgb, a * col.a);
}
`;
