// ============================================================================
// Standalone Shader: Star — granulated photosphere, corona, prominences
//
// Corona is two inverse-power terms in stellar radii, with equatorial
// streamers, plumes and threading. Colour comes from the seeded spectral
// class; see src/star-palette.ts.
// ============================================================================

export const FRAG_STAR = `
void main() {
    vec2 raw_uv = v_pos;
    vec2 uv = (floor(raw_uv * u_pixels) / u_pixels) + 0.5;
    float t = u_time * u_time_speed;

    vec2 centered = uv - 0.5;
    float d_circle = length(centered);
    float angle = atan(centered.y, centered.x);

    // Body is shrunk so the corona and prominences fit inside the canvas.
    float body_r = 0.28;
    float canvas_edge = 0.50;

    // Remap UVs so the body fills the same [0,0.5] normalized space.
    vec2 s_uv = centered / (body_r * 2.0) + 0.5;
    float s_d = distance(s_uv, vec2(0.5));
    float ang01 = angle / 6.2832 + 0.5;
    float glow_pulse = 1.0 + 0.12 * sin(t) + 0.06 * sin(t * 2.15);

    // === CORONA ===
    // Measured in stellar radii, the way coronal brightness is actually
    // described. Two inverse-power terms: a very steep one that dies within a
    // fraction of a radius (the bright ring hugging the limb) and a shallow
    // one that carries a faint tail outward. A single mid exponent gives the
    // flat, painted-on halo — the sum is what makes it read as light.
    // x >= 1 by construction, so the negative exponents never see a base
    // below zero, which would be undefined in GLSL ES 1.0.
    float x = max(d_circle / body_r, 1.0);
    float near = pow(x, -7.0);
    float far  = pow(x, -2.3);

    // Streamers are denser near the magnetic equator and open into shorter
    // brushes at the poles, so the corona is wider than it is tall.
    float tiltA = u_seed2 * 0.0628;
    float eq = 1.0 - 0.42 * abs(sin(angle - tiltA));

    // Low-frequency angular structure: a few wide plumes, not many thin spikes.
    // It modulates only the far term, so the limb ring stays smooth and
    // unbroken and the structure appears as you move outward.
    float s1 = fbm_s(vec2(ang01 * 4.0, t * 0.03), 4, u_seed5, 4.0);
    float s2 = fbm_s(vec2(ang01 * 11.0, t * 0.05), 3, u_seed6, 11.0);
    float plume = 0.45 + 1.25 * pow(clamp(s1 * 1.25 + s2 * 0.4, 0.0, 1.0), 1.6);

    // Faint radial threading, strongest far out where the plumes live.
    float thread = fbm_s(vec2(ang01 * 55.0, d_circle * 1.6 - t * 0.04), 2, u_seed6, 55.0);
    float threading = 0.80 + 0.40 * thread;

    float corona = near * 0.55 + far * eq * plume * threading * 0.42;
    // The frame is square; without this the faint tail would clip as a box.
    corona *= smoothstep(canvas_edge, canvas_edge * 0.72, d_circle);
    corona *= glow_pulse;

    // Hot and dense at the limb, thinning to the pale glow slot outward.
    vec3 cor_col = mix(u_col4.rgb, u_col0.rgb, clamp(near * 2.2, 0.0, 1.0));
    vec4 result = vec4(cor_col, clamp(corona, 0.0, 1.0) * 0.85 * u_col4.a);

    // === SPICULES ===
    // A fur of short jets standing on the limb, only a few pixels deep. Both
    // octaves wrap on themselves around the circle (85 against a wrap size of
    // 85, 20 against 20), so there is no seam.
    float sp_hi = fbm_s(vec2(ang01 * 85.0, t * 0.10), 2, u_seed6, 85.0);
    float sp_lo = fbm_s(vec2(ang01 * 20.0, t * 0.06), 3, u_seed6, 20.0);
    float sp_len = 0.005 + 0.024 * sp_hi * (0.4 + sp_lo);
    float sp_a = smoothstep(body_r + sp_len, body_r, d_circle) * step(body_r - 0.004, d_circle);
    result = alphaBlend(result, vec4(u_col1.rgb, sp_a * 0.85));

    // === PROMINENCES ===
    // Five loops. Each is an arc of a circle whose centre sits just outside
    // the limb, so the loop rises, curves over and comes back down.
    float prom = 0.0;
    float prom_hot = 0.0;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float ha = rand_s(vec2(fi, 3.0), u_seed3, 8.0);
        float hs = rand_s(vec2(fi, 9.0), u_seed3, 8.0);
        float hl = rand_s(vec2(fi, 5.0), u_seed3, 8.0);
        // Slow drift + a per-loop life cycle so they grow and fade, not blink.
        float pa = (ha + t * 0.012 + fi * 0.2) * 6.2832;
        float life = 0.5 - 0.5 * cos((t * 0.16 + hs) * 6.2832);
        float rad = (0.032 + 0.070 * hl) * (0.35 + 0.65 * life);
        vec2 c = vec2(cos(pa), sin(pa)) * (body_r * 0.96);
        float dl = abs(length(centered - c) - rad);
        float thick = 0.006 + 0.010 * hl;
        // Anchored ON the limb, so only the outer half of the ring survives the
        // clip and it reads as an arc rising from the surface, not a bubble.
        float outside = step(body_r, d_circle);
        float band = smoothstep(thick, thick * 0.25, dl) * outside;
        prom = max(prom, band * (0.45 + 0.55 * life));
        prom_hot = max(prom_hot, smoothstep(thick * 0.5, 0.0, dl) * outside * life);
    }
    // Prominences are cool, dense plasma seen against the corona: red, not white.
    result = alphaBlend(result, vec4(u_col2.rgb, prom * 0.95));
    result = alphaBlend(result, vec4(u_col1.rgb, prom_hot * 0.55));

    // === CHROMOSPHERE ===
    float rim_a = smoothstep(body_r + 0.007, body_r + 0.002, d_circle)
                * smoothstep(body_r - 0.005, body_r - 0.001, d_circle);
    result = alphaBlend(result, vec4(u_col0.rgb, rim_a * 0.8));

    // === STAR SURFACE (voronoi granulation) ===
    float star_a = step(d_circle, body_r);
    vec2 star_pix = rotate2d(s_uv, u_rotation);
    star_pix = spherify(star_pix);

    float n = cells(star_pix + vec2(t, 0.0), 10.0, 2.0);
    n *= cells(star_pix + vec2(t * 0.5, 0.0), 20.0, 2.0);
    n *= 2.0;
    n = clamp(n, 0.0, 1.0);

    float interp = floor(n * 3.0) / 3.0;
    vec4 star_col = sampleRamp4(interp, u_col0, u_col1, u_col2, u_col3);
    float limb = 1.0 - 0.62 * pow(clamp(s_d / 0.5, 0.0, 1.0), 2.6);
    star_col.rgb = mix(u_col3.rgb, star_col.rgb, limb);
    result = alphaBlend(result, vec4(star_col.rgb, star_a * star_col.a));

    // === FLARE LAYER ===
    float flare_scale = 1.2;
    vec2 flare_uv = (s_uv - 0.5) / flare_scale + 0.5;
    float flare_d = distance(flare_uv, vec2(0.5));
    float flare_sz = 2.0;

    // Angle as a fraction of a turn, scaled so one full turn spans exactly
    // flare_sz — the wrap period of rand_s. Feeding a raw atan() in leaves the
    // branch cut at +/-pi in a different hash cell from its own neighbour, and
    // the pattern discontinues along that radius.
    float flare_turn = fract((angle - u_rotation) / 6.2832 + 0.5) * flare_sz;
    vec2 flare_circleUV = vec2(flare_d, flare_turn);

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
