// ============================================================================
// Celestial Generator — Production-ready Modular API
// For Abyssal Rift integration
// ============================================================================

import {
  CelestialType,
  type CelestialParams,
  type RGBA,
  type NebulaColors,
  type RenderProfile,
} from './types.js';
import { PALETTES, COLOR_SLOTS, LOOP_LCMS } from './palettes.js';
import { createFallbackTexture, uploadTexture } from './webgl.js';
import { generateFallbackNoise, loadNoiseImage } from './noise.js';
import { ShaderRenderer } from './renderers/shader-renderer.js';
import { BlackHoleRenderer } from './renderers/black-hole.js';
import { renderNebula } from './renderers/nebula.js';

// --- Profile imports ---
import { terrainWetProfile } from './profiles/terrain-wet.js';
import { terrainDryProfile } from './profiles/terrain-dry.js';
import { aquaticProfile } from './profiles/aquatic.js';
import { barrenProfile } from './profiles/barren.js';
import { gasGiantProfile } from './profiles/gas-giant.js';
import { gasGiantRingedProfile } from './profiles/gas-giant-ringed.js';
import { moltenProfile } from './profiles/molten.js';
import { iceProfile } from './profiles/ice.js';
import { starProfile } from './profiles/star.js';
import { galaxyProfile } from './profiles/galaxy.js';
import { blackHoleProfile } from './profiles/black-hole.js';
import { nebulaProfile } from './profiles/nebula.js';

// ============================================================================
// Profile Registry
// ============================================================================

const PROFILES: Record<string, RenderProfile> = {
  [CelestialType.TerrainWet]: terrainWetProfile,
  [CelestialType.TerrainDry]: terrainDryProfile,
  [CelestialType.Aquatic]: aquaticProfile,
  [CelestialType.Barren]: barrenProfile,
  [CelestialType.GasGiant]: gasGiantProfile,
  [CelestialType.GasGiantRinged]: gasGiantRingedProfile,
  [CelestialType.Molten]: moltenProfile,
  [CelestialType.Ice]: iceProfile,
  [CelestialType.Star]: starProfile,
  [CelestialType.Galaxy]: galaxyProfile,
  [CelestialType.BlackHole]: blackHoleProfile,
  [CelestialType.Nebula]: nebulaProfile,
};

// ============================================================================
// CelestialGenerator
// ============================================================================

/**
 * Production-ready WebGL/Canvas 2D celestial body renderer.
 *
 * Supports 12 celestial types: planets, stars, black holes, galaxies, and nebulae.
 * Each type is rendered using composable shader features or specialized pipelines.
 *
 * @example
 * ```ts
 * const gen = new CelestialGenerator();
 * await gen.loadNoiseTexture('art/radial-noise9.png');
 * await gen.precompile();
 * const canvas = gen.render({ type: CelestialType.Star, seed: 42 }, 0);
 * ```
 */
export class CelestialGenerator {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private quadVBO: WebGLBuffer;
  private fallbackTexture: WebGLTexture;
  private noiseTexture: WebGLTexture | null = null;
  private noiseImage: HTMLImageElement | null = null;
  private shaderRenderer: ShaderRenderer;
  private bhRenderer: BlackHoleRenderer;

  /**
   * Create a new CelestialGenerator.
   * Generates a procedural fallback noise texture (128x128) automatically.
   *
   * @param canvas Optional existing canvas to render into. If omitted, creates one.
   */
  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas || document.createElement('canvas');
    const gl = this.canvas.getContext('webgl', {
      premultipliedAlpha: false,
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    // Fullscreen quad VBO
    const vbo = gl.createBuffer();
    if (!vbo) throw new Error('Failed to create buffer');
    this.quadVBO = vbo;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    // Fallback texture
    this.fallbackTexture = createFallbackTexture(gl);

    // Generate procedural fallback noise and upload
    const fallbackNoise = generateFallbackNoise(128);
    this.noiseTexture = uploadTexture(gl, fallbackNoise);

    // Initialize renderers
    this.shaderRenderer = new ShaderRenderer(gl, this.quadVBO, this.fallbackTexture);
    this.shaderRenderer.setNoiseTexture(this.noiseTexture);
    this.bhRenderer = new BlackHoleRenderer(gl, this.quadVBO);
  }

  /**
   * Precompile shaders for specified types (or all shader-based types).
   * Call during a loading screen to avoid first-render stutter.
   * Yields between compilations to avoid blocking the main thread.
   *
   * @param types Types to precompile. Omit to compile all shader-based types.
   */
  async precompile(types?: CelestialType[]): Promise<void> {
    const toCompile = types || Object.values(CelestialType).filter(
      t => t !== CelestialType.BlackHole && t !== CelestialType.Nebula,
    );

    for (const type of toCompile) {
      const profile = PROFILES[type];
      if (!profile || profile.mode === 'multipass' || profile.mode === 'canvas2d') continue;
      this.shaderRenderer.precompile(profile);
      // Yield to avoid blocking
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  }

  /**
   * Load a noise texture from a URL.
   * Provides high-quality detail for the black hole accretion disk
   * and replaces the procedural fallback.
   *
   * @param src URL of the noise texture image.
   */
  async loadNoiseTexture(src: string): Promise<void> {
    const img = await loadNoiseImage(src);
    this.noiseImage = img;
    this.setNoiseTexture(img);
    this.bhRenderer.setNoiseImage(img);
  }

  /**
   * Set noise texture from an already-loaded image source.
   *
   * @param source Image, canvas, or other TexImageSource.
   */
  setNoiseTexture(source: TexImageSource): void {
    const gl = this.gl;
    if (this.noiseTexture) gl.deleteTexture(this.noiseTexture);
    this.noiseTexture = uploadTexture(gl, source);
    this.shaderRenderer.setNoiseTexture(this.noiseTexture);
  }

  /**
   * Render a celestial body.
   *
   * @param params Render parameters (type, seed, resolution, etc.).
   * @param time   Animation time in seconds.
   * @returns The canvas element containing the rendered result.
   */
  render(params: CelestialParams, time: number): HTMLCanvasElement | OffscreenCanvas {
    const gl = this.gl;
    const res = params.resolution || 512;
    const type = params.type;

    // Nebula uses Canvas 2D — returns a separate canvas
    if (type === CelestialType.Nebula) {
      return renderNebula(params.seed, res, params.colors as unknown as NebulaColors | undefined);
    }

    // Resize canvas if needed
    if (this.canvas.width !== res || this.canvas.height !== res) {
      this.canvas.width = res;
      this.canvas.height = res;
    }
    gl.viewport(0, 0, res, res);

    // Black hole uses multi-pass renderer
    if (type === CelestialType.BlackHole) {
      const profile = PROFILES[CelestialType.BlackHole];
      const basePalette = profile.palette;
      const userColors = params.colors || {};
      const palette: Record<string, RGBA> = {};
      for (const key of profile.colorSlots) {
        palette[key] = userColors[key] || basePalette[key];
      }
      const timeSpeed = params.timeSpeed ?? 0.1;
      this.bhRenderer.render(palette, time, timeSpeed);
      return this.canvas;
    }

    // Standard shader-based rendering
    const profile = PROFILES[type];
    if (!profile) throw new Error(`Unknown celestial type: ${type}`);
    this.shaderRenderer.render(profile, params, time);
    return this.canvas;
  }

  /**
   * Render and read back the pixel data as an ImageData object.
   *
   * @param params Render parameters.
   * @param time   Animation time in seconds.
   * @returns ImageData with RGBA pixel values.
   */
  renderToImageData(params: CelestialParams, time: number): ImageData {
    this.render(params, time);
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Flip Y (WebGL is bottom-up)
    const row = w * 4;
    const tmp = new Uint8Array(row);
    for (let y = 0; y < Math.floor(h / 2); y++) {
      const top = y * row;
      const bot = (h - 1 - y) * row;
      tmp.set(pixels.subarray(top, top + row));
      pixels.copyWithin(top, bot, bot + row);
      pixels.set(tmp, bot);
    }

    return new ImageData(new Uint8ClampedArray(pixels.buffer), w, h);
  }

  /**
   * Get the underlying canvas element.
   * Note: for Nebula type, `render()` returns a separate canvas.
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get the seamless animation loop duration in seconds for a given type.
   *
   * @param type      Celestial type.
   * @param timeSpeed Animation speed multiplier (default 0.1).
   * @returns Loop duration in seconds, or 0 for static types (Nebula).
   */
  getLoopDuration(type: CelestialType, timeSpeed?: number): number {
    const speed = timeSpeed ?? 0.1;
    const lcm = LOOP_LCMS[type];
    return lcm ? lcm / speed : 0;
  }

  /** Get all available celestial type enum values. */
  static getCelestialTypes(): CelestialType[] {
    return Object.values(CelestialType);
  }

  /**
   * Get the named color slot list for a celestial type.
   * Slots map to u_col0, u_col1, ... in order.
   */
  static getColorSlots(type: CelestialType): string[] {
    return [...(COLOR_SLOTS[type] || [])];
  }

  /**
   * Get the default color palette for a celestial type.
   * Returns a copy — mutations do not affect the defaults.
   */
  static getDefaultPalette(type: CelestialType): Record<string, RGBA> {
    return { ...(PALETTES[type] || {}) };
  }

  /**
   * Release all WebGL resources.
   * Call when the generator is no longer needed.
   */
  dispose(): void {
    const gl = this.gl;
    this.shaderRenderer.dispose();
    this.bhRenderer.dispose();
    gl.deleteBuffer(this.quadVBO);
    gl.deleteTexture(this.fallbackTexture);
    if (this.noiseTexture) gl.deleteTexture(this.noiseTexture);
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export { CelestialType } from './types.js';
export type { CelestialParams, CelestialConfig, RGBA, RGB, NebulaColors } from './types.js';
export { renderNebula } from './renderers/nebula.js';
