// ============================================================================
// Celestial Generator — Type Definitions
// ============================================================================

/** RGBA color tuple with components in [0, 1]. */
export type RGBA = [number, number, number, number];

/** RGB color tuple with components in [0, 255] (used by nebula). */
export type RGB = [number, number, number];

/** All renderable celestial body types. */
export enum CelestialType {
  TerrainWet = 'terrain_wet',
  TerrainDry = 'terrain_dry',
  Aquatic = 'aquatic',
  Barren = 'barren',
  GasGiant = 'gas_giant',
  GasGiantRinged = 'gas_giant_ringed',
  Molten = 'molten',
  Ice = 'ice',
  Star = 'star',
  BlackHole = 'black_hole',
  Galaxy = 'galaxy',
  Nebula = 'nebula',
}

/** Parameters for rendering a single celestial body. */
export interface CelestialParams {
  type: CelestialType;
  seed: number;
  /** Canvas resolution in pixels (default 512). */
  resolution?: number;
  /** Rotation angle in radians (default 0). */
  rotationAngle?: number;
  /** Animation speed multiplier (default 0.1). */
  timeSpeed?: number;
  /** Light source position in [0,1] UV space (default [0.39, 0.7]). */
  lightPos?: [number, number];
  /** Override palette colors by slot name. Values are RGBA [0-1]. */
  colors?: Record<string, RGBA>;
  /** Per-type visual config overrides. */
  config?: Partial<CelestialConfig>;
}

/** Tunable visual parameters exposed per-type. */
export interface CelestialConfig {
  /** FBM octave count for base planet layers (default 6, max 10). */
  fbmOctaves: number;
  /** Noise scale for base FBM (default 10). */
  noiseScale: number;
  /** Cloud cover threshold 0-1 (default 0.546). */
  cloudCover: number;
  /** Cloud noise scale (default 4). */
  cloudScale: number;
  /** Land cutoff threshold (default 0.5 for terrain, 0.65 for aquatic). */
  landCutoff: number;
  /** Crater noise scale (default 5). */
  craterScale: number;
  /** Flow layer (lava/ice) cutoff (default 0.6). */
  flowCutoff: number;
  /** Flow layer FBM octaves (default 5 for molten, 4 for ice). */
  flowOctaves: number;
  /** Flow layer noise scale (default 10). */
  flowScale: number;
}

/** How a render profile produces its shader. */
export type RenderMode = 'composed' | 'standalone' | 'multipass' | 'canvas2d';

/** Descriptor for a composable GLSL feature snippet. */
export interface ShaderFeature {
  id: string;
  /** Which u_seed indices this feature reads. */
  seedSlots: number[];
  /** [start, end) range of u_col indices this feature reads. */
  colorSlotRange: [number, number];
  /** Returns parameterized GLSL code to be inserted into main(). */
  glsl: (params: Record<string, number>) => string;
}

/** A feature instance with its parameters bound. */
export interface BoundFeature {
  feature: ShaderFeature;
  params: Record<string, number>;
}

/** Render profile for a celestial type. */
export interface RenderProfile {
  type: CelestialType;
  mode: RenderMode;
  /** UV scaling factor (1.05 for types with atmosphere, 1.0 otherwise). */
  uvScaling: number;
  /** For composed mode: ordered feature list. */
  features?: BoundFeature[];
  /** For standalone mode: complete fragment shader main() body. */
  standaloneGlsl?: string;
  /** Default color palette. */
  palette: Record<string, RGBA>;
  /** Ordered slot names mapping to u_col0..u_col15. */
  colorSlots: string[];
  /** Loop period LCM for seamless animation. */
  loopLCM: number;
  /** Default config values for this type. */
  defaults: Partial<CelestialConfig>;
}

// --- Black Hole types ---

export interface BHGradientStop { offset: number; color: string; }
export interface BHMaskStop { offset: number; alpha: number; }

export interface BHTheme {
  glow: BHGradientStop[];
  hGlow: BHGradientStop[];
  backglow: BHGradientStop[];
  holeBloom: string;
  holeHalo: string;
  holeOuterRim: string;
  /** Partial rgba string — alpha appended at use site. */
  holeInsetA: string;
  /** Partial rgba string — alpha appended at use site. */
  holeInsetB: string;
}

export interface BlackHoleState {
  prog: WebGLProgram;
  locMvp: WebGLUniformLocation;
  locModel: WebGLUniformLocation;
  locTex: WebGLUniformLocation;
  locAlpha: WebGLUniformLocation;
  locClipZ: WebGLUniformLocation;
  aPosLoc: number;
  proj: Float32Array;
  texGlow: WebGLTexture;
  glowHW: number;
  glowHH: number;
  texHGlow: WebGLTexture;
  hglowHS: number;
  texBglow: WebGLTexture;
  bglowHS: number;
  texHole: WebGLTexture;
  holeHS: number;
  texEH: WebGLTexture | null;
  texHEH: WebGLTexture | null;
}

// --- Nebula types ---

export interface NebulaColors {
  /** Dominant nebula RGB [0-255] — if omitted, derived from seed. */
  dominant?: RGB;
  /** Secondary tint layers — up to 3 extra [r, g, b] values. */
  accents?: RGB[];
}
