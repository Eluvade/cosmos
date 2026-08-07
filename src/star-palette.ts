// ============================================================================
// Star — procedural palette derivation from stellar class
// ============================================================================
//
// A star's colour is not a free parameter: it is its surface temperature. So
// the seed picks a spectral class, the class gives a temperature range, and
// every slot is the blackbody colour at that temperature — offset per slot by
// the temperature of the surface feature it represents. Bright granule centres
// run hotter than the star's mean, the intergranular lanes cooler, and the
// corona hotter still, so a red dwarf's dark bands are deep red while a blue
// giant's are steel, and neither needed authoring.
//
// Lightness comes from the reference palette rather than from the blackbody,
// because the surface shader posterises into four bands and that ramp has to
// stay legible at every temperature. Temperature sets hue and saturation;
// the designed brightness structure is preserved.

import type { RGBA } from './types.js';
import { unitFromSeed } from './seed.js';
import { srgbToOklch, oklchToSrgb, mixOklab, blackbodyToSrgb, type OKLCh } from './color.js';

/** A spectral class: a temperature range and how often it comes up. */
export interface StarClass {
  /** Harvard spectral type, or the name of an off-locus theme. */
  name: string;
  /** Relative selection weight. */
  weight: number;
  /** Effective temperature range in Kelvin. */
  temp: [number, number];
  /**
   * Off-locus hue anchor in OKLCh degrees for the nominal band.
   *
   * A blackbody's colour runs deep red -> orange -> white -> blue and nothing
   * else; purple, green and vivid saturated reds are physically unreachable at
   * any temperature. Setting this overrides the blackbody hue, which is how a
   * stylised sun gets a colour the Planckian locus cannot produce. Omit it for
   * a physically-derived star.
   */
  hue?: number;
  /** Chroma multiplier against the reference palette. Only for themed classes. */
  chroma?: number;
}

/**
 * Spectral classes, weighted for a game rather than for reality.
 *
 * A real population is ~76% M dwarfs and would render as a sky of identical
 * red pinpricks. These weights keep M and K common enough to feel like the
 * baseline while giving the hot classes enough presence to be worth finding.
 *
 * The last three are off-locus themes rather than real spectral types: real
 * starlight is pastel, so a genuinely vivid sun has to leave the blackbody
 * curve. They are weighted to stay uncommon, so a coloured sun reads as
 * something worth flying to.
 */
export const STAR_CLASSES: StarClass[] = [
  { name: 'M', weight: 0.22, temp: [2400, 3700] },
  { name: 'K', weight: 0.18, temp: [3700, 5200] },
  { name: 'G', weight: 0.16, temp: [5200, 6000] },
  { name: 'F', weight: 0.13, temp: [6000, 7500] },
  { name: 'A', weight: 0.08, temp: [7500, 10000] },
  { name: 'B', weight: 0.04, temp: [10000, 18000] },
  { name: 'O', weight: 0.01, temp: [18000, 25000] },

  { name: 'crimson', weight: 0.07, temp: [3000, 4200], hue: 33, chroma: 1.15 },
  { name: 'violet', weight: 0.06, temp: [3800, 5200], hue: 310, chroma: 1.25 },
  { name: 'azure', weight: 0.05, temp: [8000, 14000], hue: 255, chroma: 1.25 },
];

/**
 * How much of the reference palette's band-to-band hue drift a themed class
 * keeps. The full drift spans ~70 degrees, which was fine on the warm end it
 * was designed for but reads as a rainbow once rotated: red occupies a narrow
 * arc in OKLCh, so the darker bands slide straight out of it into magenta.
 * Compressing the drift holds each family together while still letting the
 * bright bands run warmer than the dark ones.
 */
const THEME_HUE_SPREAD = 0.35;

const SLOTS = ['star1', 'star2', 'star3', 'star4', 'glow'] as const;
type Slot = (typeof SLOTS)[number];

/**
 * Temperature of each slot's surface feature, relative to the star's mean.
 * Granule centres are hotter than the photosphere and the lanes between them
 * cooler; the corona is hotter than either.
 */
const FEATURE_TEMP: Record<Slot, number> = {
  star1: 1.10,
  star2: 1.00,
  star3: 0.86,
  star4: 0.74,
  glow: 1.20,
};

/**
 * Temperature the shipped palette corresponds to. Chroma is normalised
 * against a blackbody at this value, so the reference palette's saturation
 * becomes the neutral point of the model.
 */
const REFERENCE_TEMP = 3400;

/** Pick a spectral class by weight from a uniform value. */
function pickClass(u: number): StarClass {
  const total = STAR_CLASSES.reduce((s, c) => s + c.weight, 0);
  let acc = 0;
  for (const cls of STAR_CLASSES) {
    acc += cls.weight / total;
    if (u < acc) return cls;
  }
  return STAR_CLASSES[STAR_CLASSES.length - 1];
}

/** The spectral class a seed produces. */
export function starClassFor(seed: number): StarClass {
  return pickClass(unitFromSeed(seed, 19));
}

/** The effective temperature in Kelvin a seed produces. */
export function starTemperature(seed: number): number {
  const cls = starClassFor(seed);
  return cls.temp[0] + (cls.temp[1] - cls.temp[0]) * unitFromSeed(seed, 20);
}

const bbOklch = (kelvin: number): OKLCh => srgbToOklch(...blackbodyToSrgb(kelvin));

/**
 * Reference palette in OKLCh, its blackbody chroma normalisers, and each
 * slot's hue offset from the nominal band. That offset is an invariant of the
 * design — bright bands run warmer than dark ones — so a themed class rotates
 * the whole set as a unit rather than recolouring slots independently.
 */
let cached: {
  ref: Record<Slot, OKLCh>;
  norm: Record<Slot, number>;
  hueOffset: Record<Slot, number>;
} | null = null;

function referenceData(base: Record<string, RGBA>) {
  if (!cached) {
    const ref = {} as Record<Slot, OKLCh>;
    const norm = {} as Record<Slot, number>;
    const hueOffset = {} as Record<Slot, number>;
    for (const slot of SLOTS) {
      const [r, g, b] = base[slot];
      ref[slot] = srgbToOklch(r, g, b);
      norm[slot] = bbOklch(REFERENCE_TEMP * FEATURE_TEMP[slot]).C;
    }
    const anchor = ref.star2.h;
    for (const slot of SLOTS) {
      hueOffset[slot] = ((ref[slot].h - anchor) % 360 + 540) % 360 - 180;
    }
    cached = { ref, norm, hueOffset };
  }
  return cached;
}

/**
 * Derive a star palette from a seed.
 *
 * @param seed      Base seed.
 * @param variation 0 returns the reference palette untouched, 1 the full
 *                  temperature range.
 * @param base      Reference palette to vary from (the shipped star palette).
 */
export function starPalette(
  seed: number,
  variation: number,
  base: Record<string, RGBA>,
): Record<string, RGBA> {
  if (!(variation > 0)) return { ...base };

  const { ref, norm, hueOffset } = referenceData(base);
  const cls = starClassFor(seed);
  const temp = starTemperature(seed);
  const t = Math.min(1, Math.max(0, variation));

  const out: Record<string, RGBA> = {};
  for (const slot of SLOTS) {
    const r = ref[slot];
    let target: OKLCh;

    if (cls.hue !== undefined) {
      // Themed: the reference palette rotated bodily onto a new hue anchor and
      // pushed past the saturation any blackbody reaches. Lightness and the
      // band-to-band structure are untouched, so it still reads as a star.
      target = {
        L: r.L,
        C: r.C * (cls.chroma ?? 1),
        h: cls.hue + hueOffset[slot] * THEME_HUE_SPREAD,
      };
    } else {
      // Physical: hue and saturation both fall out of the temperature.
      // Scaling the blackbody's own chroma by how saturated the reference band
      // is relative to a blackbody at the reference temperature preserves the
      // designed saturation ramp while letting temperature set the overall
      // level — hot stars go pale, cool ones stay deep, with no authoring.
      const bb = bbOklch(temp * FEATURE_TEMP[slot]);
      const ratio = Math.min(3, Math.max(0.3, r.C / Math.max(norm[slot], 1e-4)));
      target = { L: r.L, C: bb.C * ratio, h: bb.h };
    }

    const mixed = mixOklab(r, target, t);
    const [rr, gg, bb2] = oklchToSrgb(mixed);
    out[slot] = [rr, gg, bb2, base[slot][3]];
  }

  return out;
}
