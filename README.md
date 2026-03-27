# @eluvade/cosmos

WebGL/Canvas 2D procedural celestial body renderer. Generates planets, stars, black holes, galaxies, and nebulae in real-time with deterministic seeded output.

Built for [Abyssal Rift](https://github.com/Eluvade) — a 2D space exploration MMORPG.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![npm](https://img.shields.io/npm/v/@eluvade/cosmos)

## Features

- **12 celestial types**: Terrain (wet/dry), Aquatic, Barren, Gas Giant (plain/ringed), Molten, Ice, Star, Black Hole, Galaxy, Nebula
- **Deterministic**: Same seed always produces the same result
- **Real-time animation**: All types except Nebula animate via WebGL shaders
- **Customizable palettes**: Override any color slot per type
- **Composable shader architecture**: Shared features (base planet, clouds, craters, atmosphere, etc.) compose into type-specific shaders
- **Configurable visuals**: Tune FBM octaves, cloud cover, noise scale, and more per instance
- **Precompilation API**: Compile shaders during loading screen to avoid runtime stutter
- **Built-in fallback noise**: Procedurally generated — no external assets required
- **Zero dependencies**

## Install

```bash
npm install @eluvade/cosmos
```

## Quick Start

```ts
import { CelestialGenerator, CelestialType } from '@eluvade/cosmos';

const gen = new CelestialGenerator();

// Optional: load high-quality noise texture for black hole detail
await gen.loadNoiseTexture('radial-noise.png');

// Optional: precompile shaders during loading screen
await gen.precompile();

// Render a star
const canvas = gen.render({
  type: CelestialType.Star,
  seed: 42,
  resolution: 256,
}, 0);

document.body.appendChild(canvas);

// Animate
function loop(time) {
  gen.render({ type: CelestialType.Star, seed: 42 }, time / 1000);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

## Render a Nebula

Nebulae use Canvas 2D (static, rendered once):

```ts
import { renderNebula } from '@eluvade/cosmos';

const canvas = renderNebula(42, 512);
document.body.appendChild(canvas);
```

## API

### `CelestialGenerator`

```ts
const gen = new CelestialGenerator(canvas?: HTMLCanvasElement);
```

| Method | Description |
|--------|-------------|
| `render(params, time)` | Render a celestial body. Returns `HTMLCanvasElement`. |
| `renderToImageData(params, time)` | Render and return pixel data as `ImageData`. |
| `precompile(types?)` | Precompile shaders. Async, yields between compilations. |
| `loadNoiseTexture(src)` | Load external noise texture for black hole detail. |
| `setNoiseTexture(source)` | Set noise from an already-loaded `TexImageSource`. |
| `getCanvas()` | Get the underlying canvas element. |
| `getLoopDuration(type, speed?)` | Get seamless loop duration in seconds. |
| `dispose()` | Release all WebGL resources. |

**Static methods:**

| Method | Description |
|--------|-------------|
| `CelestialGenerator.getCelestialTypes()` | All `CelestialType` enum values. |
| `CelestialGenerator.getColorSlots(type)` | Named color slot list for a type. |
| `CelestialGenerator.getDefaultPalette(type)` | Default RGBA palette for a type. |

### `CelestialParams`

```ts
interface CelestialParams {
  type: CelestialType;
  seed: number;
  resolution?: number;        // Default: 512
  rotationAngle?: number;     // Radians, default: 0
  timeSpeed?: number;         // Default: 0.1
  lightPos?: [number, number]; // UV [0-1], default: [0.39, 0.7]
  colors?: Record<string, RGBA>; // Override palette colors
  config?: Partial<CelestialConfig>; // Visual tuning overrides
}
```

### `CelestialConfig`

Tunable visual parameters (all optional, sensible defaults per type):

| Parameter | Default | Description |
|-----------|---------|-------------|
| `fbmOctaves` | 6 | FBM octave count for base layers |
| `noiseScale` | 10 | Base noise scale |
| `cloudCover` | 0.546 | Cloud cover threshold (0-1) |
| `cloudScale` | 4 | Cloud noise scale |
| `landCutoff` | 0.5 | Land visibility threshold |
| `craterScale` | 5 | Crater noise scale |
| `flowCutoff` | 0.6 | Lava/ice flow threshold |
| `flowOctaves` | 5 | Flow layer FBM octaves |
| `flowScale` | 10 | Flow layer noise scale |

### `CelestialType`

```ts
enum CelestialType {
  TerrainWet, TerrainDry, Aquatic, Barren,
  GasGiant, GasGiantRinged, Molten, Ice,
  Star, BlackHole, Galaxy, Nebula
}
```

### `renderNebula(seed, size?, colors?)`

Standalone Canvas 2D nebula renderer. Returns `HTMLCanvasElement`.

```ts
function renderNebula(
  seed: number,
  size?: number,          // Default: 512
  colors?: NebulaColors,  // Optional color overrides
): HTMLCanvasElement;
```

## Custom Palettes

Override any color slot by name:

```ts
gen.render({
  type: CelestialType.Star,
  seed: 42,
  colors: {
    star1: [0.2, 0.5, 1.0, 1],  // RGBA [0-1]
    star2: [0.1, 0.3, 0.8, 1],
    glow:  [0.3, 0.4, 1.0, 1],
  },
}, 0);
```

Use `CelestialGenerator.getColorSlots(type)` to see available slot names.

## Architecture

```
src/
  index.ts              Public API
  types.ts              Type definitions
  seed.ts               Integer hash seed derivation
  palettes.ts           Default color palettes
  webgl.ts              WebGL utilities
  noise.ts              Procedural fallback noise

  glsl/
    header.glsl.ts      Vertex shader + fragment header
    common.glsl.ts      Shared GLSL functions (branchless)
    composer.ts          Feature composition engine
    features/            6 composable GLSL features
    standalone/          5 standalone type shaders

  profiles/             12 render profiles (feature configs)
  renderers/
    shader-renderer.ts  Generic GLSL renderer
    black-hole.ts       Multi-pass black hole pipeline
    nebula.ts           Canvas 2D nebula renderer
```

## Browser Support

Requires WebGL 1.0. Works in all modern browsers.

## License

[MIT](LICENSE)
