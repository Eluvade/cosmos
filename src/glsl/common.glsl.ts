// ============================================================================
// GLSL Common Functions — shared across all celestial shaders
// Dither removed. Branches converted to mix+step where applicable.
// ============================================================================

export const GLSL_COMMON = `
vec2 rotate2d(vec2 coord, float angle) {
    coord -= 0.5;
    coord *= mat2(vec2(cos(angle), -sin(angle)), vec2(sin(angle), cos(angle)));
    return coord + 0.5;
}

vec2 spherify(vec2 uv) {
    vec2 centered = uv * 2.0 - 1.0;
    float z2 = 1.0 - dot(centered, centered);
    if (z2 < 0.0) return uv;
    float z = sqrt(z2);
    vec2 sphere = centered / (z + 1.0);
    return sphere * 0.5 + 0.5;
}

// --- Standard noise (wrap vec2(1) * floor(sz+0.5)) ---

float rand_s(vec2 coord, float s, float sz) {
    coord = mod(coord, vec2(floor(sz + 0.5)));
    return fract(sin(dot(coord, vec2(12.9898, 78.233))) * 15.5453 * s);
}

float noise_s(vec2 coord, float s, float sz) {
    vec2 i = floor(coord);
    vec2 f = fract(coord);
    float a = rand_s(i, s, sz);
    float b = rand_s(i + vec2(1.0, 0.0), s, sz);
    float c = rand_s(i + vec2(0.0, 1.0), s, sz);
    float d = rand_s(i + vec2(1.0, 1.0), s, sz);
    vec2 cubic = f * f * (3.0 - 2.0 * f);
    return mix(a, b, cubic.x) + (c - a) * cubic.y * (1.0 - cubic.x) + (d - b) * cubic.x * cubic.y;
}

float fbm_s(vec2 coord, int oct, float s, float sz) {
    float value = 0.0;
    float scale = 0.5;
    for (int i = 0; i < 10; i++) {
        if (i >= oct) break;
        value += noise_s(coord, s, sz) * scale;
        coord *= 2.0;
        scale *= 0.5;
    }
    return value;
}

float circleNoise_s(vec2 uv, float s, float sz) {
    float uv_y = floor(uv.y);
    uv.x += uv_y * 0.31;
    vec2 f = fract(uv);
    float h = rand_s(vec2(floor(uv.x), floor(uv_y)), s, sz);
    float m = length(f - 0.25 - h * 0.5);
    float r = h * 0.25;
    return smoothstep(0.0, r, m * 0.75);
}

float circleCrater_s(vec2 uv, float s, float sz) {
    float uv_y = floor(uv.y);
    uv.x += uv_y * 0.31;
    vec2 f = fract(uv);
    float h = rand_s(vec2(floor(uv.x), floor(uv_y)), s, sz);
    float m = length(f - 0.25 - h * 0.5);
    float r = h * 0.25;
    return smoothstep(r - 0.10 * r, r, m);
}

// --- Wide noise (wrap vec2(2,1) * floor(sz+0.5)) ---

float rand_w(vec2 coord, float s, float sz) {
    coord = mod(coord, vec2(2.0, 1.0) * floor(sz + 0.5));
    return fract(sin(dot(coord, vec2(12.9898, 78.233))) * 15.5453 * s);
}

float noise_w(vec2 coord, float s, float sz) {
    vec2 i = floor(coord);
    vec2 f = fract(coord);
    float a = rand_w(i, s, sz);
    float b = rand_w(i + vec2(1.0, 0.0), s, sz);
    float c = rand_w(i + vec2(0.0, 1.0), s, sz);
    float d = rand_w(i + vec2(1.0, 1.0), s, sz);
    vec2 cubic = f * f * (3.0 - 2.0 * f);
    return mix(a, b, cubic.x) + (c - a) * cubic.y * (1.0 - cubic.x) + (d - b) * cubic.x * cubic.y;
}

float fbm_w(vec2 coord, int oct, float s, float sz) {
    float value = 0.0;
    float scale = 0.5;
    for (int i = 0; i < 10; i++) {
        if (i >= oct) break;
        value += noise_w(coord, s, sz) * scale;
        coord *= 2.0;
        scale *= 0.5;
    }
    return value;
}

float circleNoise_w(vec2 uv, float s, float sz) {
    float uv_y = floor(uv.y);
    uv.x += uv_y * 0.31;
    vec2 f = fract(uv);
    float h = rand_w(vec2(floor(uv.x), floor(uv_y)), s, sz);
    float m = length(f - 0.25 - h * 0.5);
    float r = h * 0.25;
    return smoothstep(0.0, r, m * 0.75);
}

// --- Voronoi cells (for star surface) ---

vec2 Hash2(vec2 p) {
    float r = 523.0 * sin(dot(p, vec2(53.3158, 43.6143)));
    return vec2(fract(15.32354 * r), fract(17.25865 * r));
}

float cells(vec2 p, float numCells, float tiles) {
    p *= numCells;
    float d = 1.0e10;
    for (int xo = -1; xo <= 1; xo++) {
        for (int yo = -1; yo <= 1; yo++) {
            vec2 tp = floor(p) + vec2(float(xo), float(yo));
            tp = p - tp - Hash2(mod(tp, numCells / tiles));
            d = min(d, dot(tp, tp));
        }
    }
    return sqrt(d);
}

// --- Circle pattern (for star blob/flare) ---

float circlePattern(vec2 uv, float circle_amt, float circle_sz, float s, float sz) {
    float invert = 1.0 / circle_amt;
    float offset = step(invert, mod(uv.y, invert * 2.0));
    uv.x += offset * invert * 0.5;
    vec2 rand_co = floor(uv * circle_amt) / circle_amt;
    uv = mod(uv, invert) * circle_amt;
    float r = rand_s(rand_co, s, sz);
    r = clamp(r, invert, 1.0 - invert);
    float circ = distance(uv, vec2(r));
    return smoothstep(circ, circ + 0.5, invert * circle_sz * rand_s(rand_co * 1.5, s, sz));
}

// --- Alpha compositing (source over) ---

vec4 alphaBlend(vec4 bg, vec4 fg) {
    float a = fg.a + bg.a * (1.0 - fg.a);
    if (a < 0.001) return vec4(0.0);
    vec3 rgb = (fg.rgb * fg.a + bg.rgb * bg.a * (1.0 - fg.a)) / a;
    return vec4(rgb, a);
}

// --- Branchless 4-color ramp (posterized) ---

vec4 sampleRamp4(float t, vec4 c0, vec4 c1, vec4 c2, vec4 c3) {
    t = clamp(t, 0.0, 1.0);
    vec4 r = mix(c0, c1, step(0.25, t));
    r = mix(r, c2, step(0.5, t));
    r = mix(r, c3, step(0.75, t));
    return r;
}

// --- Smooth 4-color gradient ---

vec4 smoothRamp4(float t, vec4 c0, vec4 c1, vec4 c2, vec4 c3) {
    t = clamp(t, 0.0, 1.0);
    vec4 r = mix(c0, c1, clamp(t / 0.333, 0.0, 1.0));
    r = mix(r, c2, clamp((t - 0.333) / 0.333, 0.0, 1.0));
    r = mix(r, c3, clamp((t - 0.666) / 0.334, 0.0, 1.0));
    return r;
}
`;
