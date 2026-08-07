// ============================================================================
// Shader Renderer — generic single-pass GLSL celestial body renderer
// ============================================================================

import type { CelestialParams, RenderProfile, RGBA } from '../types.js';
import { CelestialType } from '../types.js';
import { hashSeed, inclinationFor } from '../seed.js';
import { createProgram } from '../webgl.js';
import { composeShader, standaloneShader } from '../glsl/composer.js';
import { VERT_SRC } from '../glsl/header.glsl.js';

/** Cached shader program and uniform locations. */
interface ProgramCache {
  prog: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | null>;
}

/**
 * Generic single-pass GLSL renderer for all non-BlackHole, non-Nebula types.
 * Manages shader compilation, uniform binding, and fullscreen quad drawing.
 */
export class ShaderRenderer {
  private gl: WebGLRenderingContext;
  private quadVBO: WebGLBuffer;
  private programs: Map<CelestialType, ProgramCache> = new Map();
  private noiseTexture: WebGLTexture | null = null;
  private fallbackTexture: WebGLTexture;
  private paletteCache: Map<string, Record<string, RGBA>> = new Map();

  constructor(gl: WebGLRenderingContext, quadVBO: WebGLBuffer, fallbackTexture: WebGLTexture) {
    this.gl = gl;
    this.quadVBO = quadVBO;
    this.fallbackTexture = fallbackTexture;
  }

  /** Set the noise texture (for types that sample u_noise_tex). */
  setNoiseTexture(tex: WebGLTexture): void {
    this.noiseTexture = tex;
  }

  /**
   * Precompile a shader for the given profile.
   * Call during loading screen to avoid runtime stutter.
   */
  precompile(profile: RenderProfile): void {
    if (this.programs.has(profile.type)) return;
    this.buildProgram(profile);
  }

  /**
   * Render a celestial body using the given profile and params.
   */
  render(profile: RenderProfile, params: CelestialParams, time: number): void {
    const gl = this.gl;
    const cache = this.getOrBuild(profile);

    const res = params.resolution || 512;
    const seed = params.seed;
    const rotation = params.rotationAngle ?? 0;
    const timeSpeed = params.timeSpeed ?? 0.1;
    const lightPos = params.lightPos ?? [0.39, 0.7];

    gl.useProgram(cache.prog);

    // Quad attribute
    const posLoc = gl.getAttribLocation(cache.prog, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Common uniforms
    this.setUniform1f(cache, 'u_pixels', res);
    this.setUniform1f(cache, 'u_time', time);
    this.setUniform1f(cache, 'u_time_speed', timeSpeed);
    this.setUniform1f(cache, 'u_rotation', rotation);
    this.setUniform2f(cache, 'u_light_origin', lightPos[0], lightPos[1]);

    // Seed uniforms
    for (let i = 1; i <= 6; i++) {
      this.setUniform1f(cache, `u_seed${i}`, hashSeed(seed, i));
    }

    // Inclination — cos(tilt) for disc types. A no-op for profiles whose
    // shader never declares u_incl, since setUniform1f skips null locations.
    const config = { ...profile.defaults, ...params.config };
    const inclDeg = config.inclinationDeg
      ?? inclinationFor(seed, config.inclinationMin ?? 0, config.inclinationMax ?? 0);
    this.setUniform1f(cache, 'u_incl', Math.cos(inclDeg * Math.PI / 180));

    // Color uniforms
    const slots = profile.colorSlots;
    const palette = this.resolvePalette(profile, seed, config.colorVariation ?? 0);
    const userColors = params.colors || {};
    for (let i = 0; i < 16; i++) {
      const slotName = slots[i];
      let color: RGBA = [0, 0, 0, 0];
      if (slotName) {
        if (userColors[slotName]) {
          color = userColors[slotName];
        } else if (palette[slotName]) {
          color = palette[slotName];
        }
      }
      this.setUniform4f(cache, `u_col${i}`, color[0], color[1], color[2], color[3]);
    }

    // Bind noise texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture || this.fallbackTexture);
    const texLoc = this.getUniform(cache, 'u_noise_tex');
    if (texLoc !== null) gl.uniform1i(texLoc, 0);

    // Clear and draw
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Release all compiled programs. */
  dispose(): void {
    const gl = this.gl;
    this.programs.forEach(c => gl.deleteProgram(c.prog));
    this.programs.clear();
    this.paletteCache.clear();
  }

  // --- Private ---

  /**
   * Resolve the base palette, deriving a seeded one where the profile offers.
   * Cached because animation re-renders the same seed every frame and the
   * derivation runs a gamut search per slot.
   */
  private resolvePalette(
    profile: RenderProfile,
    seed: number,
    variation: number,
  ): Record<string, RGBA> {
    if (!profile.seededPalette || !(variation > 0)) return profile.palette;

    const key = `${profile.type}|${seed}|${variation}`;
    let palette = this.paletteCache.get(key);
    if (!palette) {
      palette = profile.seededPalette(seed, variation, profile.palette);
      if (this.paletteCache.size >= 128) this.paletteCache.clear();
      this.paletteCache.set(key, palette);
    }
    return palette;
  }

  private getOrBuild(profile: RenderProfile): ProgramCache {
    let cache = this.programs.get(profile.type);
    if (!cache) cache = this.buildProgram(profile);
    return cache;
  }

  private buildProgram(profile: RenderProfile): ProgramCache {
    let fragSrc: string;
    if (profile.mode === 'composed' && profile.features) {
      fragSrc = composeShader(profile.features, profile.uvScaling);
    } else if (profile.mode === 'standalone' && profile.standaloneGlsl) {
      fragSrc = standaloneShader(profile.standaloneGlsl);
    } else {
      throw new Error(`Invalid profile mode for shader rendering: ${profile.mode}`);
    }

    const prog = createProgram(this.gl, VERT_SRC, fragSrc);
    const cache: ProgramCache = { prog, uniforms: new Map() };
    this.programs.set(profile.type, cache);
    return cache;
  }

  private getUniform(cache: ProgramCache, name: string): WebGLUniformLocation | null {
    if (!cache.uniforms.has(name)) {
      cache.uniforms.set(name, this.gl.getUniformLocation(cache.prog, name));
    }
    return cache.uniforms.get(name)!;
  }

  private setUniform1f(cache: ProgramCache, name: string, value: number): void {
    const loc = this.getUniform(cache, name);
    if (loc !== null) this.gl.uniform1f(loc, value);
  }

  private setUniform2f(cache: ProgramCache, name: string, x: number, y: number): void {
    const loc = this.getUniform(cache, name);
    if (loc !== null) this.gl.uniform2f(loc, x, y);
  }

  private setUniform4f(cache: ProgramCache, name: string, r: number, g: number, b: number, a: number): void {
    const loc = this.getUniform(cache, name);
    if (loc !== null) this.gl.uniform4f(loc, r, g, b, a);
  }
}
