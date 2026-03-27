// ============================================================================
// Nebula — Pure Canvas 2D procedural nebula renderer (no dependencies)
// Port of the p5.js "Ancient Stars" sketch by Sophia Wood
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

const TAU = Math.PI * 2;
const INTERNAL_RES = 900;

/**
 * Render a procedural nebula to an off-screen canvas.
 *
 * @param seed   Deterministic seed for repeatable output.
 * @param size   Output canvas size in pixels (square). Internally always renders
 *               at 900px for consistent visuals, then scales to the requested size.
 * @param colors Optional color overrides.
 * @returns HTMLCanvasElement with the rendered nebula.
 */
export function renderNebula(
  seed: number,
  size = 512,
  colors?: NebulaColors,
): HTMLCanvasElement {
  const rng = new SeededRNG(seed);
  const c = INTERNAL_RES;

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = c;
  renderCanvas.height = c;
  const ctx = renderCanvas.getContext('2d')!;

  // --- Drawing helpers ---

  function fill(r: number, g: number, b: number, a: number): void {
    const clampedA = Math.max(0, Math.min(255, a));
    ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${clampedA / 255})`;
  }

  function circle(x: number, y: number, d: number): void {
    const r = Math.abs(d) / 2;
    if (r < 0.1) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  // --- Core routines ---

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
    ctx.save();
    ctx.translate(rng.random(-c / 2, c / 2), rng.random(-c / 10, c / 10));
    nebula(rng.random(100, 255), rng.random(100, 255), rng.random(100, 255), 29, 100);
    ctx.scale(0.05, 0.05);
    nebula(rng.random(100, 255), rng.random(100, 255), rng.random(100, 255), 10, 2);
    nebula(255, 255, 255, 2, 2);
    stars();
    ctx.restore();
  }

  // --- Compose the scene ---

  ctx.save();
  ctx.translate(c / 2, c / 2);
  const sc = rng.random(0.3, 1);
  ctx.scale(sc, sc);
  ctx.rotate(rng.random(-Math.PI, Math.PI));

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
    ctx.save();
    ctx.translate((c / 3) * rng.randomGaussian(), (c / 3) * rng.randomGaussian());
    ctx.scale(rng.random(0.5, 1), rng.random(0.5, 1));
    ctx.rotate(rng.random(-Math.PI / 4, Math.PI / 4));
    nebula(rng.random(100, 255), rng.random(100, 255), rng.random(100, 255), 15, 100);
    ctx.restore();
  }

  ctx.restore();

  // Soft vignette — fade alpha to transparent at edges
  const cx = c / 2, cy = c / 2;
  const vm = c;
  const vg = ctx.createRadialGradient(cx, cy, vm * 0.25, cx, cy, vm * 0.52);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.6, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, c, c);
  ctx.globalCompositeOperation = 'source-over';

  // Scale to requested output size
  if (size === c) return renderCanvas;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = size;
  outCanvas.height = size;
  const outCtx = outCanvas.getContext('2d')!;
  outCtx.drawImage(renderCanvas, 0, 0, size, size);
  return outCanvas;
}
