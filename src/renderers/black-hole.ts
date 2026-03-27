// ============================================================================
// Black Hole — Multi-pass WebGL renderer with Canvas 2D pre-rendered textures
// Extracted from the monolithic celestial-generator.ts
// ============================================================================

import type { RGBA, BHGradientStop, BHMaskStop, BHTheme, BlackHoleState } from '../types.js';
import { createProgram, uploadBHTexture } from '../webgl.js';

// ============================================================================
// Constants (800px canvas, S=0.4 — matching original black-hole-canvas.ts)
// ============================================================================

const BH_S = 0.4;
const BH_TILT = (84 * Math.PI) / 180;
const BH_HOLE_R = (200 / 2) * BH_S;
const BH_GLOW_RX = (400 / 2) * BH_S;
const BH_GLOW_RY = (350 / 2) * BH_S;
const BH_EH_R = (400 / 2) * BH_S;
const BH_HEH_R = (1500 / 2) * BH_S * 1.05;
const BH_HGLOW_R = (800 / 2) * BH_S;
const BH_BGLOW_R = (1200 / 2) * BH_S;
const BH_GLOW_BLUR = 33 * BH_S;
const BH_HGLOW_BLUR = 83 * BH_S;
const BH_BGLOW_BLUR = 20 * BH_S;
const BH_PERSP = 1200 * BH_S;
const BH_TY = -50 * BH_S;
const BH_HEH_PERIOD = 10;
const BH_EH_PERIOD = 3.33;
const BH_CANVAS = 800;
const BH_ZOOM = 1.74;

// ============================================================================
// Mat4 Utilities (column-major Float32Array[16])
// ============================================================================

type BHMat4 = Float32Array;

function bhM4(): BHMat4 { return new Float32Array(16); }
function bhM4Id(): BHMat4 { const m = bhM4(); m[0] = m[5] = m[10] = m[15] = 1; return m; }

function bhM4Mul(a: BHMat4, b: BHMat4): BHMat4 {
  const o = bhM4();
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}

function bhM4Scale(sx: number, sy: number): BHMat4 { const m = bhM4Id(); m[0] = sx; m[5] = sy; return m; }

function bhM4RotX(a: number): BHMat4 {
  const m = bhM4Id(), c = Math.cos(a), s = Math.sin(a);
  m[5] = c; m[9] = -s; m[6] = s; m[10] = c; return m;
}

function bhM4RotZ(a: number): BHMat4 {
  const m = bhM4Id(), c = Math.cos(a), s = Math.sin(a);
  m[0] = c; m[4] = -s; m[1] = s; m[5] = c; return m;
}

function bhM4Trans(x: number, y: number, z: number): BHMat4 {
  const m = bhM4Id(); m[12] = x; m[13] = y; m[14] = z; return m;
}

function bhM4Proj(): BHMat4 {
  const m = bhM4();
  const cx = BH_CANVAS / 2, cy = BH_CANVAS / 2;
  m[0] = BH_ZOOM / cx;
  m[5] = -BH_ZOOM / cy;
  m[10] = -0.001;
  m[11] = -1 / BH_PERSP;
  m[15] = 1;
  return m;
}

// ============================================================================
// Model Builders
// ============================================================================

function bhModelFaceOn(hw: number, hh: number, angle = 0): BHMat4 {
  const s = bhM4Scale(hw, hh);
  return angle ? bhM4Mul(bhM4RotZ(angle), s) : s;
}

function bhModelTilted(hs: number, angle = 0): BHMat4 {
  let m: BHMat4 = bhM4Scale(hs, hs);
  if (angle) m = bhM4Mul(bhM4RotZ(angle), m);
  m = bhM4Mul(bhM4Trans(0, BH_TY, 0), m);
  return bhM4Mul(bhM4RotX(BH_TILT), m);
}

// ============================================================================
// BH Shaders
// ============================================================================

const BH_VS = `
attribute vec2 aPos;
uniform mat4 uMVP;
uniform mat4 uModel;
varying vec2 vUV;
varying float vZ;
void main() {
  vUV = aPos * 0.5 + 0.5;
  vZ  = (uModel * vec4(aPos, 0.0, 1.0)).z;
  gl_Position = uMVP * vec4(aPos, 0.0, 1.0);
}
`;

const BH_FS = `
precision mediump float;
varying vec2 vUV;
varying float vZ;
uniform sampler2D uTex;
uniform float uAlpha;
uniform float uClipZ;
void main() {
  vec4 c = texture2D(uTex, vUV);
  c *= uAlpha;
  if (uClipZ != 0.0) {
    float fade = smoothstep(-50.0, 50.0, vZ * uClipZ);
    c *= fade;
  }
  gl_FragColor = c;
}
`;

// ============================================================================
// Theme Builder
// ============================================================================

function bhRgba(c: RGBA, a: number): string {
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
}

function bhRgb(c: RGBA): string {
  return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
}

function bhRgbaPartial(c: RGBA): string {
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},`;
}

/** Build a BH theme from palette RGBA colors. */
export function buildBHTheme(palette: Record<string, RGBA>): BHTheme {
  const g1 = palette.glow1, g2 = palette.glow2, g3 = palette.glow3, g4 = palette.glow4;
  const pur = palette.purple, rim = palette.rim, ins = palette.inset;
  return {
    glow: [
      { offset: 0.0, color: bhRgba(g1, 0.65) },
      { offset: 0.08, color: bhRgba(g1, 0.55) },
      { offset: 0.20, color: bhRgba(g2, 0.6) },
      { offset: 0.34, color: bhRgba(g2, 0.6) },
      { offset: 0.49, color: bhRgba(g3, 0.55) },
      { offset: 0.63, color: bhRgba(g3, 0.55) },
      { offset: 0.73, color: bhRgba(g4, 0.45) },
      { offset: 0.83, color: bhRgba(g4, 0.18) },
      { offset: 0.97, color: bhRgba(g4, 0.05) },
      { offset: 1.0, color: bhRgba(g4, 0) },
    ],
    hGlow: [
      { offset: 0, color: bhRgba(g1, 0) },
      { offset: 0.53, color: bhRgba(g1, 0) },
      { offset: 0.54, color: 'rgba(255,255,255,0.7)' },
      { offset: 0.55, color: bhRgba(g1, 0.85) },
      { offset: 0.59, color: bhRgba(g2, 0.75) },
      { offset: 0.63, color: bhRgba(g2, 0.85) },
      { offset: 0.73, color: bhRgba(g3, 0.6) },
      { offset: 0.83, color: bhRgba(g4, 0.4) },
      { offset: 0.97, color: bhRgba(g4, 0.1) },
      { offset: 1.0, color: bhRgba(g4, 0) },
    ],
    backglow: [
      { offset: 0, color: bhRgba(pur, 0) },
      { offset: 0.14, color: bhRgba(pur, 0) },
      { offset: 0.4, color: bhRgba(pur, 0.1) },
      { offset: 0.7, color: 'rgba(0,0,0,0)' },
      { offset: 1.0, color: 'rgba(0,0,0,0)' },
    ],
    holeBloom: bhRgba(pur, 0.6),
    holeHalo: bhRgba(pur, 0.6),
    holeOuterRim: bhRgb(rim),
    holeInsetA: bhRgbaPartial(rim),
    holeInsetB: bhRgbaPartial(ins),
  };
}

// ============================================================================
// Canvas 2D Pre-rendering
// ============================================================================

function bhMakeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return [c, c.getContext('2d')!];
}

function bhPrerenderGlow(theme: BHTheme): HTMLCanvasElement {
  const margin = BH_GLOW_BLUR * 3;
  const w = (BH_GLOW_RX + margin) * 2;
  const h = (BH_GLOW_RY + margin) * 2;
  const [canvas, ctx] = bhMakeCanvas(w, h);
  const cx = w / 2, cy = h / 2;
  ctx.filter = `blur(${BH_GLOW_BLUR}px)`;
  const gradR = Math.sqrt(BH_GLOW_RX ** 2 + BH_GLOW_RY ** 2);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gradR);
  for (const s of theme.glow) g.addColorStop(s.offset, s.color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, BH_GLOW_RX, BH_GLOW_RY, 0, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function bhPrerenderCircularGlow(radius: number, blur: number, stops: BHGradientStop[]): HTMLCanvasElement {
  const margin = blur * 3;
  const sz = (radius + margin) * 2;
  const [canvas, ctx] = bhMakeCanvas(sz, sz);
  const c = sz / 2;
  ctx.filter = `blur(${blur}px)`;
  const fcR = radius * Math.SQRT2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, fcR);
  for (const s of stops) g.addColorStop(s.offset, s.color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, radius, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function bhPrerenderHGlow(theme: BHTheme): HTMLCanvasElement {
  return bhPrerenderCircularGlow(BH_HGLOW_R, BH_HGLOW_BLUR, theme.hGlow);
}

function bhPrerenderBackglow(theme: BHTheme): HTMLCanvasElement {
  return bhPrerenderCircularGlow(BH_BGLOW_R, BH_BGLOW_BLUR, theme.backglow);
}

function bhPrerenderHole(theme: BHTheme): HTMLCanvasElement {
  const R = 100;
  const bloomBlur = 100;
  const margin = bloomBlur + 100;
  const size = (R + margin) * 2;
  const [canvas, ctx] = bhMakeCanvas(size, size);
  const cx = size / 2, cy = size / 2;

  // Massive radial bloom
  ctx.save(); ctx.filter = `blur(${bloomBlur}px)`;
  ctx.fillStyle = theme.holeBloom;
  ctx.beginPath(); ctx.arc(cx, cy, R + 10, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // White halo
  ctx.save(); ctx.filter = 'blur(50px)';
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(cx, cy, R + 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Black separator ring
  ctx.save(); ctx.filter = 'blur(2px)';
  ctx.fillStyle = 'rgb(0,0,0)';
  ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Close halo
  ctx.save(); ctx.filter = 'blur(6px)';
  ctx.fillStyle = theme.holeHalo;
  ctx.beginPath(); ctx.arc(cx, cy, R + 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Outer rim
  ctx.save(); ctx.filter = 'blur(2px)';
  ctx.fillStyle = theme.holeOuterRim;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Black center fill
  ctx.fillStyle = 'black';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

  // Inset glow A
  const iG1 = ctx.createRadialGradient(cx, cy, R - 2, cx, cy, R);
  iG1.addColorStop(0, 'transparent');
  iG1.addColorStop(0.5, theme.holeInsetA + '0.15)');
  iG1.addColorStop(1, theme.holeInsetA + '0.5)');
  ctx.fillStyle = iG1;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

  // Inset glow B
  const iG2 = ctx.createRadialGradient(cx, cy, R - 3, cx, cy, R);
  iG2.addColorStop(0, 'transparent');
  iG2.addColorStop(0.5, theme.holeInsetB + '0.1)');
  iG2.addColorStop(1, theme.holeInsetB + '0.35)');
  ctx.fillStyle = iG2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

  return canvas;
}

function bhCreateMaskedTexture(
  texture: HTMLImageElement, radius: number, maskStops: BHMaskStop[],
): HTMLCanvasElement {
  const size = Math.ceil(radius * 2);
  const [canvas, ctx] = bhMakeCanvas(size, size);
  const c = size / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(c, c, radius, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(texture, 0, 0, size, size);
  ctx.restore();
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createRadialGradient(c, c, 0, c, c, radius);
  for (const s of maskStops) g.addColorStop(s.offset, `rgba(0,0,0,${s.alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

// ============================================================================
// Black Hole Renderer Class
// ============================================================================

/**
 * Multi-pass Black Hole renderer.
 * Uses WebGL for compositing pre-rendered Canvas 2D gradient textures
 * with z-clipped tilted disk projections.
 */
export class BlackHoleRenderer {
  private gl: WebGLRenderingContext;
  private quadVBO: WebGLBuffer;
  private state: BlackHoleState | null = null;
  private noiseImage: HTMLImageElement | null = null;

  constructor(gl: WebGLRenderingContext, quadVBO: WebGLBuffer) {
    this.gl = gl;
    this.quadVBO = quadVBO;
  }

  /** Set the noise image source for accretion disk texture. */
  setNoiseImage(img: HTMLImageElement): void {
    this.noiseImage = img;
    // Force re-init on next render if state exists
    if (this.state && !this.state.texHEH) {
      this.dispose();
    }
  }

  /**
   * Initialize or reinitialize the BH state from the given palette.
   */
  private init(palette: Record<string, RGBA>): void {
    const gl = this.gl;
    this.dispose();

    const theme = buildBHTheme(palette);
    const prog = createProgram(gl, BH_VS, BH_FS);
    gl.useProgram(prog);

    const locMvp = gl.getUniformLocation(prog, 'uMVP')!;
    const locModel = gl.getUniformLocation(prog, 'uModel')!;
    const locTex = gl.getUniformLocation(prog, 'uTex')!;
    const locAlpha = gl.getUniformLocation(prog, 'uAlpha')!;
    const locClipZ = gl.getUniformLocation(prog, 'uClipZ')!;
    const aPosLoc = gl.getAttribLocation(prog, 'aPos');
    gl.uniform1i(locTex, 0);

    const proj = bhM4Proj();

    // Pre-render gradient textures
    const glow = bhPrerenderGlow(theme);
    const hglow = bhPrerenderHGlow(theme);
    const bglow = bhPrerenderBackglow(theme);
    const hole = bhPrerenderHole(theme);

    const texGlow = uploadBHTexture(gl, glow);
    const texHGlow = uploadBHTexture(gl, hglow);
    const texBglow = uploadBHTexture(gl, bglow);
    const texHole = uploadBHTexture(gl, hole);

    // Masked noise textures
    let texEH: WebGLTexture | null = null;
    let texHEH: WebGLTexture | null = null;
    if (this.noiseImage) {
      texEH = uploadBHTexture(gl, bhCreateMaskedTexture(this.noiseImage, BH_EH_R, [
        { offset: 0, alpha: 1 }, { offset: 0.283, alpha: 1 },
        { offset: 0.99, alpha: 0 }, { offset: 1.0, alpha: 0 },
      ]));
      texHEH = uploadBHTexture(gl, bhCreateMaskedTexture(this.noiseImage, BH_HEH_R, [
        { offset: 0, alpha: 1 }, { offset: 0.283, alpha: 0.7 },
        { offset: 0.99, alpha: 0 }, { offset: 1.0, alpha: 0 },
      ]));
    }

    this.state = {
      prog, locMvp, locModel, locTex, locAlpha, locClipZ, aPosLoc, proj,
      texGlow, glowHW: glow.width / 2, glowHH: glow.height / 2,
      texHGlow, hglowHS: hglow.width / 2,
      texBglow, bglowHS: bglow.width / 2,
      texHole, holeHS: (hole.width / 2) * BH_S,
      texEH, texHEH,
    };
  }

  /**
   * Render the black hole.
   *
   * @param palette  Resolved palette (base + user overrides).
   * @param time     Current animation time.
   * @param timeSpeed Animation speed multiplier.
   */
  render(palette: Record<string, RGBA>, time: number, timeSpeed: number): void {
    const gl = this.gl;

    // Init or rebuild if noise image arrived
    if (!this.state || (this.state.texHEH === null && this.noiseImage !== null)) {
      this.init(palette);
    }
    const s = this.state!;

    gl.useProgram(s.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.enableVertexAttribArray(s.aPosLoc);
    gl.vertexAttribPointer(s.aPosLoc, 2, gl.FLOAT, false, 0, 0);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    const t = time * timeSpeed;
    const hehAngle = ((t % BH_HEH_PERIOD) / BH_HEH_PERIOD) * Math.PI * 2;
    const ehAngle = ((t % BH_EH_PERIOD) / BH_EH_PERIOD) * Math.PI * 2;

    const blendOver = () => gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const blendScreen = () => gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);

    // Layer 1: Face-on warm glow
    blendOver();
    this.drawQuad(s, s.texGlow, bhModelFaceOn(s.glowHW, s.glowHH), 1, 0);

    // Layer 2: HEH back half
    if (s.texHEH) {
      blendScreen();
      this.drawQuad(s, s.texHEH, bhModelTilted(BH_HEH_R, hehAngle), 0.35, -1);
    }

    // Layer 3: H-glow x2 back half
    blendOver();
    this.drawQuad(s, s.texHGlow, bhModelTilted(s.hglowHS), 1, -1);
    this.drawQuad(s, s.texHGlow, bhModelTilted(s.hglowHS), 1, -1);

    // Layer 4: Face-on event horizon
    if (s.texEH) {
      blendScreen();
      this.drawQuad(s, s.texEH, bhModelFaceOn(BH_EH_R, BH_EH_R, ehAngle), 0.7, 0);
    }

    // Layer 5: Backglow
    blendOver();
    this.drawQuad(s, s.texBglow, bhModelTilted(s.bglowHS), 1, 0);

    // Layer 6: Hole
    this.drawQuad(s, s.texHole, bhModelFaceOn(s.holeHS, s.holeHS), 1, 0);

    // Layer 7: H-glow x2 front half
    blendOver();
    this.drawQuad(s, s.texHGlow, bhModelTilted(s.hglowHS), 1, 1);
    this.drawQuad(s, s.texHGlow, bhModelTilted(s.hglowHS), 1, 1);

    // Layer 8: HEH front half
    if (s.texHEH) {
      blendScreen();
      this.drawQuad(s, s.texHEH, bhModelTilted(BH_HEH_R, hehAngle), 0.35, 1);
    }

    // Restore GL state
    gl.disable(gl.BLEND);
  }

  /** Release all BH-specific GL resources. */
  dispose(): void {
    if (!this.state) return;
    const gl = this.gl;
    const s = this.state;
    gl.deleteProgram(s.prog);
    gl.deleteTexture(s.texGlow);
    gl.deleteTexture(s.texHGlow);
    gl.deleteTexture(s.texBglow);
    gl.deleteTexture(s.texHole);
    if (s.texEH) gl.deleteTexture(s.texEH);
    if (s.texHEH) gl.deleteTexture(s.texHEH);
    this.state = null;
  }

  private drawQuad(
    s: BlackHoleState, tex: WebGLTexture, model: Float32Array, alpha: number, clipZ: number,
  ): void {
    const gl = this.gl;
    const mvp = bhM4Mul(s.proj, model);
    gl.uniformMatrix4fv(s.locMvp, false, mvp);
    gl.uniformMatrix4fv(s.locModel, false, model);
    gl.uniform1f(s.locAlpha, alpha);
    gl.uniform1f(s.locClipZ, clipZ);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
