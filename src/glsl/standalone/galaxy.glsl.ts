// ============================================================================
// Standalone Shader: Galaxy — grand-design density wave with tilted disc
// Single pass. u_incl is cos(inclination): 1.0 face-on, ~0.22 near edge-on.
// ============================================================================

export const FRAG_GALAXY = `
uniform float u_incl;

const float GX_ARMS  = 2.0;
const float GX_PITCH = 3.4;
const float GX_CLUMP = 0.78;

mat2 gx_rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

// A density wave is a pattern, not matter: it turns at one rigid speed. The
// sin term is the bounded shear of material passing through it. An unbounded
// 1/r term would wind the spiral tighter forever and read as a collapse.
float gx_pattern(float r, float t) {
    return t * 0.55 + 0.20 * sin(t * 0.45 - r * 3.2);
}

float gx_stars(vec2 uv, float density, float s) {
    vec2 g = floor(uv * density);
    vec2 f = fract(uv * density) - 0.5;
    float h  = rand_s(g, s, density);
    float h2 = rand_s(g + vec2(19.0, 7.0), s, density);
    float d  = length(f - (vec2(h2, fract(h * 7.3)) - 0.5) * 0.7);
    return step(0.88, h) * smoothstep(0.18, 0.0, d) * (0.35 + h2 * 0.65);
}

void main() {
    vec2 uv = (floor(v_pos * u_pixels) / u_pixels) + 0.5;
    float t = u_time * u_time_speed;

    float ci = clamp(u_incl, 0.16, 1.0);
    float edge = 1.0 - smoothstep(0.28, 0.95, ci);   // 0 face-on -> 1 edge-on

    // Screen space, de-rotated by the galaxy's position angle.
    vec2 p = gx_rot(u_seed1 * 0.0628 + u_rotation) * (uv - 0.5);
    // Disc-plane coordinates: un-projecting y by cos(inclination) is a real
    // tilt, not a squash, so the arms foreshorten correctly.
    vec2 nq = vec2(p.x, p.y / ci) * 2.0;
    float r = length(nq);
    if (r > 1.5 && length(p) > 0.42) { gl_FragColor = vec4(0.0); return; }

    float a     = atan(nq.y, nq.x);
    float spin  = gx_pattern(min(r, 1.5), t);
    float logr  = log(max(r, 0.03));
    // +logr winds the arms the other way from a trailing spiral, which is what
    // makes the crests sweep inward toward the core rather than out of frame.
    float phase = GX_ARMS * (a + spin) + logr * GX_PITCH * GX_ARMS;

    float wave = pow(cos(phase) * 0.5 + 0.5, 2.2);

    // Noise sampled in the spiral frame, so clumps and dust ride with the arms.
    vec2 wq = gx_rot(-logr * GX_PITCH + spin) * nq;
    float clump = fbm_s(wq * 11.0 + 3.0, 4, u_seed2, 20.0);
    float knots = fbm_s(wq * 30.0 + 9.0, 3, u_seed3, 20.0);
    float haze  = fbm_s(wq *  5.0,       3, u_seed4, 20.0);

    float env = smoothstep(0.07, 0.36, r) * (1.0 - smoothstep(0.55, 1.10, r));
    float arm = wave * env * mix(0.55, clump * 2.0, GX_CLUMP);

    float disc = (1.0 - smoothstep(0.12, 1.10, r)) * (0.26 + haze * 0.92);

    // Bulge and core live in screen space: a spheroid stays round as the disc
    // tilts away, which is what sells the third dimension.
    float by    = 0.150 * mix(1.0, 0.62, edge);
    float rb    = length(vec2(p.x / 0.150, p.y / by));
    float bulge = exp(-rb * rb * 1.55);
    float core  = exp(-rb * rb * 9.0);
    float halo  = exp(-(p.x * p.x / 0.055 + p.y * p.y / mix(0.055, 0.017, edge)));

    // Spiral dust on the trailing edge of each crest.
    float dust = pow(cos(phase - 0.7) * 0.5 + 0.5, 3.5) * env * (0.4 + clump)
               * smoothstep(0.22, 0.48, r);
    // A single dust lane across the disc plane, only once it is tilted enough
    // for the near side to cross in front of the bulge.
    float wob  = fbm_s(vec2(p.x * 7.0 + 4.0, 1.0), 3, u_seed4, 20.0);
    float lw   = (0.012 + 0.011 * wob) * mix(2.4, 1.0, edge);
    // Squared by multiplication, not pow(): pow() with a negative base is
    // undefined in GLSL ES 1.0 and returns NaN on some drivers.
    float ly   = p.y / lw;
    float lane = exp(-ly * ly)
               * (1.0 - smoothstep(0.24, 0.46, abs(p.x)))
               * smoothstep(0.03, 0.14, abs(p.x)) * edge;

    float pts = gx_stars(uv, 115.0, u_seed5) * (0.24 + (arm + disc) * 1.7);

    vec3 light = vec3(0.0);
    light += u_col6.rgb * halo * 0.18;
    light += u_col3.rgb * disc * mix(0.30, 0.52, edge);
    light += mix(u_col3.rgb, u_col2.rgb, smoothstep(0.22, 1.05, arm)) * arm * 1.05;
    light += u_col4.rgb * arm * smoothstep(0.46, 0.74, knots) * 2.10;
    light += u_col1.rgb * bulge * 1.05;
    light += u_col0.rgb * core  * 1.50;
    light += vec3(1.0)  * pts   * 0.50;

    float shield = 1.0 - core;
    light *= 1.0 - dust * 0.55 * shield - lane * 0.85;
    light  = mix(light, u_col5.rgb, clamp(dust * 0.20 + lane * 0.32, 0.0, 1.0) * shield);

    // Brightness-driven alpha: the body fades out as light, with no alpha ring.
    float lum = max(light.r, max(light.g, light.b));
    gl_FragColor = vec4(light / max(lum, 0.0001), clamp(lum, 0.0, 1.0));
}
`;
