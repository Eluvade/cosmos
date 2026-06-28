// ============================================================================
// Nebula — procedural nebula renderer (no dependencies)
// Port of the p5.js "Ancient Stars" sketch by Sophia Wood
//
// Rendering model: every dab is accumulated into a Float32 premultiplied-RGBA
// buffer with manual source-over blending, then written ONCE to the output
// canvas via putImageData. We deliberately do NOT lean on Canvas2D's own alpha
// blending: the dabs use sub-1/255 alpha, and the precision with which those
// accumulate is browser- AND thread-dependent (a main-thread HTMLCanvas keeps
// sub-LSB precision and builds the soft cloud; a Worker's OffscreenCanvas uses an
// 8-bit premultiplied store that rounds each tiny dab to zero, so the cloud never
// forms). Doing the accumulation in a float buffer makes the result pure
// arithmetic — bit-identical on every browser and on both main thread and worker.
// The canvas is only a sink for already-finished pixels.
// ============================================================================

import type { NebulaColors } from '../types.js';

// ============================================================================
// Seeded RNG
// ============================================================================

class SeededRNG {
  private s: number;
  private hasSpare = false;
  private spare = 0;

  constructor(seed: number) {
    this.s = seed;
  }

  /** Deterministic pseudo-random in [0, 1). */
  next(): number {
    this.s = (this.s * 16807 + 0) % 2147483647;
    return (this.s - 1) / 2147483646;
  }

  /** random() / random(max) / random(min, max) */
  random(a?: number, b?: number): number {
    if (b !== undefined) return a! + this.next() * (b - a!);
    if (a !== undefined) return this.next() * a;
    return this.next();
  }

  /** Box-Muller Gaussian. */
  randomGaussian(mean = 0, sd = 1): number {
    if (this.hasSpare) {
      this.hasSpare = false;
      return mean + sd * this.spare;
    }
    let u: number, v: number, s: number;
    do {
      u = this.next() * 2 - 1;
      v = this.next() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    s = Math.sqrt(-2 * Math.log(s) / s);
    this.spare = v * s;
    this.hasSpare = true;
    return mean + sd * u * s;
  }
}

// ============================================================================
// Renderer
// ============================================================================

const INTERNAL_RES = 900;

// Tone curve applied to the accumulated alpha at output. The float buffer keeps
// every dab with zero loss, which renders fuller/brighter than the old lossy
// Canvas2D bake (whose 8-bit rounding quietly dropped faint dabs, thinning the
// cloud into soft dark gaps). These knobs reproduce that look deliberately:
//   GAMMA > 1 crushes faint alpha toward black far more than bright alpha, dimming
//            the haze and reopening the dark voids between wisps.
//   GAIN     overall brightness after the curve (lower = less overexposed).
//   SAT  > 1 enriches colour by pulling each channel away from its luma, so the
//            gas reads as coloured instead of washing toward white.
// alpha_out = clamp(alpha^GAMMA · GAIN); rgb_out = luma + (rgb − luma)·SAT.
const TONE_GAMMA = 7.0;
const TONE_GAIN = 1.0;
const TONE_SAT = 1.85;

/** Create a canvas that works in both main thread and Web Workers. */
function makeCanvas(size: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof document === 'undefined') return new OffscreenCanvas(size, size);
  const el = document.createElement('canvas');
  el.width = size;
  el.height = size;
  return el;
}

/**
 * Render a procedural nebula to an off-screen canvas.
 *
 * @param seed   Deterministic seed for repeatable output.
 * @param size   Output canvas size in pixels (square). Internally always renders
 *               at 900px for consistent visuals, then scales to the requested size.
 * @param colors Optional color overrides.
 * @returns HTMLCanvasElement (or OffscreenCanvas in a Worker) with the rendered nebula.
 */
export function renderNebula(
  seed: number,
  size = 512,
  colors?: NebulaColors,
): HTMLCanvasElement | OffscreenCanvas {
  const rng = new SeededRNG(seed);
  const c = INTERNAL_RES;

  // Premultiplied-RGBA accumulation buffer: [pr, pg, pb, a] per pixel, with
  // pr = trueColor * a in [0,255] and a in [0,1]. Manual source-over below.
  const buf = new Float32Array(c * c * 4);

  // Current 2D affine, mirroring Canvas2D semantics: device X = a·x + c·y + e,
  // device Y = b·x + d·y + f. save()/restore() push/pop copies.
  let m = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const save = (): void => { stack.push(m.slice()); };
  const restore = (): void => { const p = stack.pop(); if (p) m = p; };
  const translate = (tx: number, ty: number): void => {
    m[4] += m[0] * tx + m[2] * ty;
    m[5] += m[1] * tx + m[3] * ty;
  };
  const scale = (sx: number, sy: number): void => {
    m[0] *= sx; m[1] *= sx; m[2] *= sy; m[3] *= sy;
  };
  const rotate = (th: number): void => {
    const co = Math.cos(th), si = Math.sin(th);
    const a = m[0], b = m[1], cc = m[2], dd = m[3];
    m[0] = a * co + cc * si;
    m[1] = b * co + dd * si;
    m[2] = -a * si + cc * co;
    m[3] = -b * si + dd * co;
  };

  // --- Drawing helpers (write into `buf`, not a canvas) ---

  // Current fill: straight rgb in [0,255], alpha in [0,1].
  let fr = 0, fg = 0, fb = 0, fa = 0;
  function fill(r: number, g: number, b: number, a: number): void {
    fr = r < 0 ? 0 : r > 255 ? 255 : (r | 0);
    fg = g < 0 ? 0 : g > 255 ? 255 : (g | 0);
    fb = b < 0 ? 0 : b > 255 ? 255 : (b | 0);
    const ca = a < 0 ? 0 : a > 255 ? 255 : a;
    fa = ca / 255;
  }

  /**
   * Rasterize a disc of local radius |d|/2 centred at local (lx0, ly0) under the
   * current affine, source-over with the current fill. Under a non-uniform scale
   * the disc becomes a rotated ellipse in device space; we scan each device row,
   * solve the conic for the exact x-span (one sqrt per row), and blend the span.
   */
  function circle(lx0: number, ly0: number, d: number): void {
    const r = Math.abs(d) / 2;
    if (r < 0.1 || fa <= 0) return;
    const a = m[0], b = m[1], cc = m[2], dd = m[3], e = m[4], f = m[5];
    const det = a * dd - b * cc;
    if (det === 0) return;

    // Device-space centre and half-extents of the ellipse.
    const Xc = a * lx0 + cc * ly0 + e;
    const Yc = b * lx0 + dd * ly0 + f;
    const hx = r * Math.sqrt(a * a + cc * cc);
    const hy = r * Math.sqrt(b * b + dd * dd);
    // Original "Ancient Stars" behaviour: only draw a dab whose whole bounding box
    // fits inside the canvas. Dabs poking past the frame are dropped ENTIRELY (never
    // partially clipped) — so edges are built from complete soft dabs, and because
    // large dabs near the frame vanish, the frame "bites" each nebula into organic
    // voids and asymmetric shapes instead of a uniform filled blob.
    if (Xc - hx < 0 || Xc + hx > c || Yc - hy < 0 || Yc + hy > c) return;
    const Y0 = Math.max(0, Math.floor(Yc - hy));
    const Y1 = Math.min(c - 1, Math.ceil(Yc + hy));
    if (Y1 < Y0) return;

    // Inverse affine: local (lx, ly) as an affine function of device (X, Y).
    const ixX = dd / det, ixY = -cc / det, ix0 = (-dd * e + cc * f) / det;
    const iyX = -b / det, iyY = a / det, iy0 = (b * e - a * f) / det;
    const A = ixX * ixX + iyX * iyX;   // px² coefficient — constant across rows
    const r2 = r * r;

    const ia = 1 - fa;
    const pr = fr * fa, pg = fg * fa, pb = fb * fa;   // premultiplied source

    for (let py = Y0; py <= Y1; py++) {
      const Y = py + 0.5;
      // u(px) = lx - lx0 = ixX·px + bx ; v(px) = ly - ly0 = iyX·px + by
      const bx = ixX * 0.5 + ixY * Y + ix0 - lx0;
      const by = iyX * 0.5 + iyY * Y + iy0 - ly0;
      const B = 2 * (ixX * bx + iyX * by);
      const C = bx * bx + by * by - r2;
      const disc = B * B - 4 * A * C;
      if (disc < 0) continue;
      const sd = Math.sqrt(disc);
      const X0 = Math.max(0, Math.ceil((-B - sd) / (2 * A)));
      const X1 = Math.min(c - 1, Math.floor((-B + sd) / (2 * A)));
      if (X1 < X0) continue;

      let idx = (py * c + X0) * 4;
      for (let px = X0; px <= X1; px++) {
        buf[idx] = pr + buf[idx] * ia;
        buf[idx + 1] = pg + buf[idx + 1] * ia;
        buf[idx + 2] = pb + buf[idx + 2] * ia;
        buf[idx + 3] = fa + buf[idx + 3] * ia;
        idx += 4;
      }
    }
  }

  // --- Core routines (identical RNG sequence to the original) ---

  function nebula(r1: number, b1: number, g1: number, s: number, a: number): void {
    a = a + c / 2000;
    const n = 8300 + Math.floor(c / 3);
    const p = c / 1500;
    const cr = 20;
    for (let i = 0; i < n; i++) {
      fill(
        r1 + rng.random(cr),
        g1 + rng.random(cr),
        b1 + rng.random(cr),
        Math.abs(rng.randomGaussian()) / 4,
      );
      circle(
        -c / 2 + (c / 2) * rng.randomGaussian(),
        (c * rng.randomGaussian()) / s,
        rng.randomGaussian(c / 100, c / s + c / 40),
      );
      fill(255, 255, 255, (a * rng.randomGaussian()) / 2);
      circle(
        -c / 2 + (c / 2) * rng.randomGaussian(),
        (c * rng.randomGaussian()) / s,
        p * rng.randomGaussian(),
      );
    }
  }

  function stars(): void {
    const n = c * 4;
    for (let i = 0; i < n; i++) {
      fill(255, 255, 255, Math.abs(255 * rng.randomGaussian()));
      circle(
        -c / 2 + (c / 2) * rng.randomGaussian(),
        c * rng.randomGaussian() * rng.randomGaussian() * rng.randomGaussian() * rng.randomGaussian(),
        0.5 * rng.randomGaussian(),
      );
    }
  }

  function cluster(): void {
    save();
    translate(rng.random(-c / 2, c / 2), rng.random(-c / 10, c / 10));
    nebula(rng.random(100, 255), rng.random(100, 255), rng.random(100, 255), 29, 100);
    scale(0.05, 0.05);
    nebula(rng.random(100, 255), rng.random(100, 255), rng.random(100, 255), 10, 2);
    nebula(255, 255, 255, 2, 2);
    stars();
    restore();
  }

  // --- Compose the scene ---

  save();
  translate(c / 2, c / 2);
  const sc = rng.random(0.3, 1);   // variety of zoom
  scale(sc, sc);
  rotate(rng.random(-Math.PI, Math.PI));   // variety in angle — body leans off-centre via the -c/2 dab offset

  const dom = colors?.dominant ?? [
    rng.random(10, 255),
    rng.random(10, 255),
    rng.random(10, 255),
  ];
  nebula(dom[0], dom[1], dom[2], 3, 6);

  stars();

  const acc = colors?.accents ?? [
    [200, 200, 200],
    [0, 200, 250],
    [250, 100, 250],
  ];
  nebula(acc[0][0], acc[0][1], acc[0][2], 7, 205);
  if (acc.length > 1) nebula(acc[1][0], acc[1][1], acc[1][2], 22, 205);
  if (acc.length > 2) nebula(acc[2][0], acc[2][1], acc[2][2], 25, 205);

  const clusterCount = Math.floor(rng.random(0, 3.1));
  for (let i = 0; i < clusterCount; i++) {
    cluster();
  }

  const g = Math.max(10, c / 12);
  const loopCount = Math.floor(rng.random(5, g));
  for (let i = 0; i < loopCount; i++) {
    save();
    translate((c / 3) * rng.randomGaussian(), (c / 3) * rng.randomGaussian());
    scale(rng.random(0.5, 1), rng.random(0.5, 1));
    rotate(rng.random(-Math.PI / 4, Math.PI / 4));
    nebula(rng.random(100, 255), rng.random(100, 255), rng.random(100, 255), 15, 100);
    restore();
  }

  restore();

  // Soft, IRREGULAR vignette. A plain radial fade caps the nebula in a fake perfect
  // circle; instead we perturb the cutoff radius by a few seeded angular harmonics so
  // the silhouette is wobbly and organic (unique per nebula), and fade over a wide
  // smoothstep band so the edge is diffuse gas, not a defined ring. Scales the
  // premultiplied colour together with alpha so the buffer stays consistent.
  const cx = c / 2, cy = c / 2;
  const baseR0 = c * 0.36, baseR1 = c * 0.60;
  const wobRng = new SeededRNG((seed ^ 0x5bd1e995) | 0 || 1);
  const NH = 5;
  const amp = new Float64Array(NH), ph = new Float64Array(NH);
  for (let k = 0; k < NH; k++) {
    amp[k] = wobRng.random(0.05, 0.18) / (k + 1);
    ph[k] = wobRng.random(0, Math.PI * 2);
  }
  for (let py = 0; py < c; py++) {
    const dy = py + 0.5 - cy;
    for (let px = 0; px < c; px++) {
      const dx = px + 0.5 - cx;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx);
      let wob = 0;
      for (let k = 0; k < NH; k++) wob += amp[k] * Math.sin((k + 1) * ang + ph[k]);
      // Distance from centre to the canvas border along this ray. Cap the outer
      // fade radius just inside it so the gradient ALWAYS reaches 0 before the
      // square edge — no hard cutoff on any side. The wobble survives wherever
      // there's room (toward the corners) and tucks in along the axes.
      const edgeDist = (c * 0.5) / Math.max(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang)));
      let R1 = baseR1 * (1 + wob);
      const cap = edgeDist * 0.98;
      if (R1 > cap) R1 = cap;
      let R0 = baseR0 * (1 + wob);
      if (R0 > R1 * 0.6) R0 = R1 * 0.6;
      let keep: number;
      if (dist <= R0) continue;            // fully inside — untouched
      else if (dist >= R1) keep = 0;
      else { const t = (dist - R0) / (R1 - R0); keep = 1 - t * t * (3 - 2 * t); }
      const idx = (py * c + px) * 4;
      buf[idx] *= keep; buf[idx + 1] *= keep; buf[idx + 2] *= keep; buf[idx + 3] *= keep;
    }
  }

  // Un-premultiply into straight 8-bit RGBA and hand the finished pixels to the
  // canvas. putImageData writes bytes verbatim on every browser/thread.
  const img = new ImageData(c, c);
  const out = img.data;
  for (let i = 0; i < buf.length; i += 4) {
    const a = buf[i + 3];
    if (a > 0) {
      // Un-premultiply to the true colour…
      const inv = 1 / a;
      let r = buf[i] * inv, gg = buf[i + 1] * inv, bb = buf[i + 2] * inv;
      // …enrich saturation (pull channels away from luma)…
      const luma = 0.299 * r + 0.587 * gg + 0.114 * bb;
      r = luma + (r - luma) * TONE_SAT;
      gg = luma + (gg - luma) * TONE_SAT;
      bb = luma + (bb - luma) * TONE_SAT;
      out[i] = r > 255 ? 255 : r < 0 ? 0 : r;
      out[i + 1] = gg > 255 ? 255 : gg < 0 ? 0 : gg;
      out[i + 2] = bb > 255 ? 255 : bb < 0 ? 0 : bb;
      // …then apply the tone curve to alpha (crush faint, keep cores).
      const ac = Math.pow(a, TONE_GAMMA) * TONE_GAIN;
      out[i + 3] = ((ac > 1 ? 1 : ac) * 255 + 0.5) | 0;
    }
  }

  const renderCanvas = makeCanvas(c);
  (renderCanvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D)
    .putImageData(img, 0, 0);

  // Scale to requested output size (a single image resample — browser-independent).
  if (size === c) return renderCanvas;
  const outCanvas = makeCanvas(size);
  const outCtx = outCanvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  outCtx.drawImage(renderCanvas as CanvasImageSource, 0, 0, size, size);
  return outCanvas;
}
