// ============================================================================
// Standalone Shader: Galaxy — spiral arms with core glow
// ============================================================================

export const FRAG_GALAXY = `
void main() {
    vec2 raw_uv = v_pos;
    vec2 uv = (floor(raw_uv * u_pixels) / u_pixels) + 0.5;
    float t = u_time * u_time_speed;

    vec2 centered = uv - 0.5;
    // Perspective tilt
    centered.y *= 2.0;
    float d = length(centered);
    float angle = atan(centered.y, centered.x);

    float sz = 20.0;
    // Core glow
    float core = exp(-d * d * 40.0);

    // Spiral arms (2 arms)
    float arm_tightness = 2.5;
    float arm1 = sin(angle + log(max(d, 0.001)) * arm_tightness + t);
    float arm2 = sin(angle + log(max(d, 0.001)) * arm_tightness + 3.14159 + t);
    float arms = max(arm1, arm2);
    arms = smoothstep(0.3, 0.9, arms);
    arms *= smoothstep(0.0, 0.05, d) * smoothstep(0.45, 0.2, d);

    // Star noise
    float stars = fbm_s(uv * sz + vec2(t * 0.33, 0.0), 4, u_seed1, sz);
    arms += stars * 0.2 * smoothstep(0.4, 0.1, d);

    // Dust lanes
    float dust = fbm_s(vec2(angle * 3.0, d * 10.0) + vec2(t * 0.17, 0.0), 3, u_seed2, sz);
    arms *= 0.7 + dust * 0.3;

    // Color assignment
    vec4 col = mix(u_col3, u_col2, arms);
    col = mix(col, u_col1, arms * smoothstep(0.15, 0.05, d));
    col = mix(col, u_col0, core);

    float alpha = smoothstep(0.45, 0.3, d) * step(0.01, core + arms);
    alpha = max(alpha, core * 0.8);

    gl_FragColor = vec4(col.rgb, alpha * col.a);
}
`;
