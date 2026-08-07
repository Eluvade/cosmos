// ============================================================================
// Galaxy — procedural palette derivation
// ============================================================================
//
// Not random colors, and not a table of hardcoded themes. The palette's slots
// stand in fixed relationships to each other — warm core, warm bulge, a cool
// arm family, knots roughly complementary to the arms, near-black dust, a
// desaturated halo relative of the arms — and those relationships are what
// make it read as a galaxy. So the seed never touches slots individually. It
// picks a *region* of color space and samples a handful of scalars inside it,
// and every slot is derived from the shipped palette by the same rotation.
//
// The regions carry correlated ranges, not just a hue: a gold-armed disc is
// old and anemic, so it draws low star-formation, which in turn desaturates
// its HII knots. Picking hue and activity independently would let you generate
// a contradiction — dead gold arms studded with vivid star-forming knots.

import type { RGBA } from './types.js';
import { unitFromSeed } from './seed.js';
import { srgbToOklch, oklchToSrgb, mixOklab, type OKLCh } from './color.js';

/** A region of palette space: a hue anchor plus the ranges that correlate with it. */
export interface HueBasin {
  /** Label, for tooling and debugging. */
  name: string;
  /** Relative selection weight. */
  weight: number;
  /** Arm hue anchor, in OKLCh degrees. */
  hue: number;
  /** Symmetric hue jitter in degrees. */
  jitter: number;
  /** Star-formation activity range — drives arm and knot chroma. */
  pop: [number, number];
  /** Core/bulge warmth range. */
  warm: [number, number];
  /** Dust density range — drives dust darkness and chroma. */
  dust: [number, number];
}

/**
 * Palette regions, weighted so the shipped blue dominates and the exotic
 * anchors stay rare — an unusual galaxy should be worth finding.
 */
export const GALAXY_BASINS: HueBasin[] = [
  { name: 'classic blue', weight: 0.50, hue: 264, jitter: 14, pop: [0.60, 1.00], warm: [-0.20, 0.30], dust: [0.40, 0.80] },
  { name: 'anemic gold',  weight: 0.20, hue:  85, jitter: 16, pop: [0.00, 0.35], warm: [ 0.30, 1.00], dust: [0.20, 0.50] },
  { name: 'teal',         weight: 0.18, hue: 205, jitter: 12, pop: [0.50, 0.90], warm: [-0.40, 0.20], dust: [0.30, 0.70] },
  { name: 'violet',       weight: 0.12, hue: 315, jitter: 14, pop: [0.45, 0.85], warm: [-0.10, 0.50], dust: [0.50, 0.90] },
];

const SLOTS = ['core', 'bulge', 'arm1', 'arm2', 'knot', 'dust', 'halo'] as const;
type Slot = (typeof SLOTS)[number];

/** Slots that belong to the cool family and rotate together with the arms. */
const COOL: Slot[] = ['arm1', 'arm2', 'knot', 'halo'];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Pick a basin by weight from a uniform value. */
function pickBasin(u: number): HueBasin {
  const total = GALAXY_BASINS.reduce((s, b) => s + b.weight, 0);
  let acc = 0;
  for (const basin of GALAXY_BASINS) {
    acc += basin.weight / total;
    if (u < acc) return basin;
  }
  return GALAXY_BASINS[GALAXY_BASINS.length - 1];
}

/** Reference palette in OKLCh, computed once from the shipped RGBA values. */
let reference: Record<Slot, OKLCh> | null = null;

function referenceOklch(palette: Record<string, RGBA>): Record<Slot, OKLCh> {
  if (!reference) {
    reference = {} as Record<Slot, OKLCh>;
    for (const slot of SLOTS) {
      const [r, g, b] = palette[slot];
      reference[slot] = srgbToOklch(r, g, b);
    }
  }
  return reference;
}

/**
 * Derive a galaxy palette from a seed.
 *
 * The result is the shipped palette interpolated toward a seeded one, so
 * `variation` is a literal dial from "exactly the reference" to "the full
 * spread of the basin set" — and every value in between stays recognisably
 * in the same family.
 *
 * @param seed      Base seed.
 * @param variation 0 returns the reference palette untouched, 1 the full range.
 * @param base      Reference palette to vary from (the shipped galaxy palette).
 */
export function galaxyPalette(
  seed: number,
  variation: number,
  base: Record<string, RGBA>,
): Record<string, RGBA> {
  if (!(variation > 0)) return { ...base };

  const ref = referenceOklch(base);
  const basin = pickBasin(unitFromSeed(seed, 13));

  const jitter = (unitFromSeed(seed, 14) * 2 - 1) * basin.jitter;
  const pop    = lerp(basin.pop[0],  basin.pop[1],  unitFromSeed(seed, 15));
  const warm   = lerp(basin.warm[0], basin.warm[1], unitFromSeed(seed, 16));
  const dusty  = lerp(basin.dust[0], basin.dust[1], unitFromSeed(seed, 17));
  const spread = 0.5 + unitFromSeed(seed, 18);

  // One rotation for the whole cool family, measured from the reference arms.
  // Deriving every cool slot through the same delta is what preserves the
  // arm1 -> arm2 fan and the arms -> knot complement at any hue.
  const dh = basin.hue + jitter - ref.arm1.h;

  const out: Record<string, RGBA> = {};
  for (const slot of SLOTS) {
    const r = ref[slot];
    let target: OKLCh;

    if (COOL.includes(slot)) {
      // Offsets from the arm anchor are invariants of the design, so they are
      // preserved exactly and only scaled where the fan should widen.
      const offset = ((r.h - ref.arm1.h) % 360 + 540) % 360 - 180;
      const scale = slot === 'knot' ? 1 : spread;
      // Knot chroma tracks star formation steeply: HII regions are lit by
      // young stars, so a disc that has stopped forming them should lose its
      // knots almost entirely rather than merely dim them.
      const chroma = slot === 'knot' ? 0.20 + 1.10 * pop
                   : slot === 'halo' ? 0.70 + 0.30 * pop
                   : 0.70 + 0.45 * pop;
      target = {
        L: r.L + (slot === 'knot' ? (pop - 0.5) * 0.06 : 0),
        C: r.C * chroma,
        h: ref.arm1.h + dh + offset * scale,
      };
    } else if (slot === 'dust') {
      // Dust is dust: it never joins the rotation, it only gets denser. The
      // slot is near-black, so density has to move lightness by a lot before
      // it reads at all — hue and chroma changes here are invisible.
      target = {
        L: r.L * lerp(1.70, 0.50, dusty),
        C: r.C * lerp(0.70, 1.30, dusty),
        h: r.h + warm * 10,
      };
    } else {
      // Old stellar populations are warm whatever the disc is doing, so the
      // core and bulge stay put and only shift colour temperature.
      target = {
        L: r.L + warm * 0.012,
        C: r.C * (0.90 + 0.25 * warm),
        h: r.h + warm * (slot === 'bulge' ? 15 : 12),
      };
    }

    const mixed = mixOklab(r, target, Math.min(1, Math.max(0, variation)));
    const [rr, gg, bb] = oklchToSrgb(mixed);
    out[slot] = [rr, gg, bb, base[slot][3]];
  }

  return out;
}
