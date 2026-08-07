<p align="center">
  <a href="https://abyssalrift.eluvade.com/">
    <img alt="Cosmos preview" title="Cosmos" src="./preview.gif"/>
  </a>
</p>

<h1 align="center">Cosmos</h1>
<p align="center">@eluvade/cosmos</p>

<div align="center">
  <a href="https://eluvade.com/">
    <img alt="Developer Logo" title="Bunny Eluvade" src="https://avatars.githubusercontent.com/u/32546052?v=4" width="66">
  </a>
</div>

WebGL/Canvas 2D procedural celestial body renderer. Generates planets, stars, black holes, galaxies, and nebulae in real-time with deterministic seeded output.

Built for [Abyssal Rift](https://abyssalrift.eluvade.com) — a 2D space exploration MMORPG.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![npm](https://img.shields.io/npm/v/@eluvade/cosmos)

**[Live Demo](https://eluvade.github.io/cosmos/examples/)**

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
  seed: 9000,
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

const canvas = renderNebula(9000, 512);
document.body.appendChild(canvas);
```

## Galaxy Inclination

Galaxies are drawn as a real tilted disc rather than a squashed circle: the disc
foreshortens with `cos(inclination)` while the bulge stays a screen-space
spheroid, and a dust lane crosses the front once the tilt is steep enough.

By default the tilt is derived from the seed inside a range you set, so a
generated system gets varied orientations with no per-body authoring:

```ts
gen.render({
  type: CelestialType.Galaxy,
  seed: 9000,
  config: { inclinationMin: 12, inclinationMax: 74 },  // degrees, the defaults
}, time);
```

Pin a single galaxy to an exact tilt with `inclinationDeg`, or read back the
seeded value — the same function the renderer uses — with `inclinationFor`:

```ts
import { inclinationFor } from '@eluvade/cosmos';

const deg = inclinationFor(9000, 12, 74);   // 0 = face-on, ~80 = near edge-on
gen.render({ type: CelestialType.Galaxy, seed: 9000, config: { inclinationDeg: deg } }, time);
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
| `CelestialGenerator.getDefaultPalette(type)` | Reference RGBA palette for a type. |
| `CelestialGenerator.getSeededPalette(type, seed, variation?)` | The palette a given seed actually renders with. |

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
| `inclinationDeg` | — | Galaxy: explicit tilt in degrees. Overrides the seeded range |
| `inclinationMin` | 12 | Galaxy: lower bound of the seed-derived tilt range |
| `inclinationMax` | 74 | Galaxy: upper bound of the seed-derived tilt range |
| `colorVariation` | 0.35 galaxy / 1.0 star | How far the seeded palette may drift from the reference (0–1) |

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
  seed: 9000,
  colors: {
    star1: [0.2, 0.5, 1.0, 1],  // RGBA [0-1]
    star2: [0.1, 0.3, 0.8, 1],
    glow:  [0.3, 0.4, 1.0, 1],
  },
}, 0);
```

Use `CelestialGenerator.getColorSlots(type)` to see available slot names.

## Procedural Palettes

Galaxies vary their colors by seed. Not per-slot randomness — that destroys the
relationships the palette depends on — but a generative model where the seed
picks a *region* of color space and samples a few correlated scalars inside it.

The slots stand in fixed relationships: warm core, warm bulge, a cool arm
family, knots roughly complementary to the arms, near-black dust, and a
desaturated halo relative of the arms. Those hold at every hue, because one
rotation drives the whole cool family and each slot's offset from the arms is
preserved exactly.

Regions carry correlated ranges, not just a hue — a gold-armed disc is old and
anemic, so it draws low star formation, which desaturates its knots. Picking
hue and activity independently could generate a contradiction: dead gold arms
studded with vivid star-forming knots.

| Region | Weight | Character |
|--------|--------|-----------|
| classic blue | 50% | The reference palette. Star-forming, pink Hα knots |
| anemic gold | 20% | Old, washed out, knots nearly gone |
| teal | 18% | Cool, star-forming |
| violet | 12% | Warm bulge against a violet disc |

```ts
gen.render({
  type: CelestialType.Galaxy,
  seed: 9000,
  config: { colorVariation: 0.35 },  // the default
}, time);
```

`colorVariation` is a literal dial from the reference palette to the full
spread. **0 reproduces the shipped palette exactly**, so pinning a set-piece
galaxy to the reference is a single field. Interpolation runs through OKLab, so
partial blends toward a near-opposite hue desaturate rather than swinging
through an unrelated one — 35% of the way from blue to gold is a washed-out
blue, not teal.

Read back what a seed will produce:

```ts
CelestialGenerator.getSeededPalette(CelestialType.Galaxy, 9000);
// { core: [...], bulge: [...], arm1: [...], ... }
```

Per-slot overrides still compose on top — let the seed pick everything and pin
just one slot:

```ts
gen.render({
  type: CelestialType.Galaxy,
  seed: 9000,
  colors: { knot: [1.0, 0.54, 0.62, 1] },  // seeded palette, fixed knots
}, time);
```

The regions themselves are exported as `GALAXY_BASINS` if you want to retune or
extend them.

### Stars: spectral class

A star's colour isn't a free parameter — it's surface temperature. The seed
picks a spectral class, the class gives a temperature range, and every slot is
the blackbody colour at that temperature, offset per slot by the temperature of
the surface feature it stands for. Bright granule centres run hotter than the
mean, intergranular lanes cooler, the corona hotter still, so a red dwarf's dark
bands come out deep red and a blue giant's come out steel — with no authoring.

| Class | Weight | Temperature | Appearance |
|-------|--------|-------------|------------|
| M | 22% | 2400–3700 K | orange-red |
| K | 18% | 3700–5200 K | amber |
| G | 16% | 5200–6000 K | white, warm lanes |
| F | 13% | 6000–7500 K | white |
| A | 8% | 7500–10000 K | blue-white |
| B | 4% | 10000–18000 K | pale blue |
| O | 1% | 18000–25000 K | pale blue |

Weighted for a game, not for reality — a real population is ~76% M dwarfs and
would render as a sky of identical red pinpricks.

### Stars: off-locus themes

A blackbody's colour runs deep red → orange → white → blue and **nothing else**.
Purple, green and vivid saturated reds are unreachable at any temperature, and
real starlight is pastel — the physical classes above top out around `#FFB159`
and `#ABC2FF`. A genuinely coloured sun has to leave the Planckian locus.

| Theme | Weight | Character |
|-------|--------|-----------|
| crimson | 7% | true red, `#F33F4F` core banding |
| violet | 6% | purple, `#A062FF` |
| azure | 5% | vivid blue, `#0094E2` |

18% of stars are themed. They use the same machinery — the reference palette
rotated bodily onto a new hue anchor and pushed past blackbody saturation, with
lightness and the band-to-band structure untouched, so they still read as stars
rather than as coloured discs.

The band-to-band hue drift is compressed to 35% for themed classes
(`THEME_HUE_SPREAD`). At full drift the ~70° spread that works on the warm end
becomes a rainbow once rotated: red occupies a narrow arc in OKLCh, so the
darker bands slide out of it into magenta.

Add your own by pushing onto `STAR_CLASSES` — `hue` is an OKLCh angle for the
nominal band, `chroma` a multiplier against the reference:

```ts
import { STAR_CLASSES } from '@eluvade/cosmos';

STAR_CLASSES.push({
  name: 'emerald', weight: 0.04, temp: [4000, 5500], hue: 150, chroma: 1.2,
});
```

Lightness comes from the reference palette rather than the blackbody, because
the surface shader posterises into four bands and that ramp has to stay legible
at every temperature. Temperature sets hue and saturation; the designed
brightness structure survives.

```ts
import { starClassFor, starTemperature } from '@eluvade/cosmos';

starClassFor(9000).name;      // 'K'
starTemperature(9000);        // 4530.2
```

`colorVariation` defaults to **1.0** for stars, unlike galaxies — the reference
palette is one K-type sample rather than an approved design, so there's nothing
to preserve by holding back. Set it to 0 to pin the old fixed orange.

Classes are exported as `STAR_CLASSES`, and `blackbodyToSrgb(kelvin)` is
available directly if you want to colour UI or lighting to match.

## Architecture

```
src/
  index.ts              Public API
  types.ts              Type definitions
  seed.ts               Integer hash seed derivation
  palettes.ts           Reference color palettes
  color.ts              OKLCh color space + blackbody
  galaxy-palette.ts     Procedural galaxy palette model
  star-palette.ts       Spectral-class star palette model
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

## Credits

This project builds on the work of several talented creators:

- **[Deep-Fold](https://github.com/Deep-Fold)** — Planet shaders ported from [PixelPlanets](https://github.com/Deep-Fold/PixelPlanets) (Godot → WebGL)
- **[Cas van den Elzen](https://codepen.io/cas-van-den-elzen)** ([@cas-van-den-elzen](https://codepen.io/cas-van-den-elzen)) — Black hole renderer based on [this CodePen](https://codepen.io/cas-van-den-elzen/pen/MWLNEoz)
- **[Sophia / Fractal Kitty](https://fractalkitty.com)** ([@fractalkitty](https://mathstodon.xyz/@fractalkitty)) — Nebula renderer based on [this CodePen](https://codepen.io/fractalkitty/pen/qBxeoLZ)

## License

[MIT](LICENSE)
