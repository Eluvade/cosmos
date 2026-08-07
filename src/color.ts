// ============================================================================
// Celestial Generator — OKLCh color space
// ============================================================================
//
// Palette derivation happens in OKLCh (Björn Ottosson's OKLab in polar form)
// rather than HSL because hue rotation there preserves perceived lightness.
// Rotating #658BE0 to a yellow at equal HSL lightness produces something that
// reads far brighter; in OKLCh the whole palette keeps its internal balance,
// which is what lets one hue anchor drive every slot.

/** Lightness [0,1], chroma [0,~0.4], hue in degrees [0,360). */
export interface OKLCh {
  L: number;
  C: number;
  h: number;
}

const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

const linearToSrgb = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

/** Convert an sRGB-encoded triple in [0,1] to OKLCh. */
export function srgbToOklch(r: number, g: number, b: number): OKLCh {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  const h = (Math.atan2(bb, a) * 180) / Math.PI;
  return { L, C: Math.hypot(a, bb), h: h < 0 ? h + 360 : h };
}

/** Convert OKLCh to a linear-unclamped sRGB triple. May fall outside [0,1]. */
function oklchToSrgbRaw(c: OKLCh): [number, number, number] {
  const hr = (c.h * Math.PI) / 180;
  const a = c.C * Math.cos(hr);
  const b = c.C * Math.sin(hr);

  const l = (c.L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (c.L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (c.L - 0.0894841775 * a - 1.2914855480 * b) ** 3;

  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ];
}

const inGamut = (rgb: [number, number, number]): boolean =>
  rgb.every(c => c >= -0.0001 && c <= 1.0001);

/**
 * Convert OKLCh to sRGB in [0,1], reducing chroma until the color fits the
 * sRGB gamut. Rotating hue at fixed chroma routinely lands outside it —
 * clipping channels would shift the hue, so we give up saturation instead.
 */
export function oklchToSrgb(c: OKLCh): [number, number, number] {
  let rgb = oklchToSrgbRaw(c);
  if (inGamut(rgb)) return rgb.map(v => Math.min(1, Math.max(0, v))) as [number, number, number];

  let lo = 0, hi = c.C;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    rgb = oklchToSrgbRaw({ L: c.L, C: mid, h: c.h });
    if (inGamut(rgb)) lo = mid; else hi = mid;
  }
  rgb = oklchToSrgbRaw({ L: c.L, C: lo, h: c.h });
  return rgb.map(v => Math.min(1, Math.max(0, v))) as [number, number, number];
}

/**
 * Colour of an ideal blackbody at a given temperature, as sRGB in [0,1].
 *
 * Normalised to the brightest channel — a star's absolute radiance is set by
 * the shader's brightness ramp, so only the chromaticity is wanted here.
 * Follows the Planckian locus in CIE 1931 xy, valid over 1667–25000 K.
 *
 * @param kelvin Temperature. Clamped to the approximation's valid range.
 */
export function blackbodyToSrgb(kelvin: number): [number, number, number] {
  const T = Math.min(25000, Math.max(1667, kelvin));
  const t2 = T * T, t3 = t2 * T;

  const x = T < 4000
    ? -0.2661239e9 / t3 - 0.2343589e6 / t2 + 0.8776956e3 / T + 0.179910
    : -3.0258469e9 / t3 + 2.1070379e6 / t2 + 0.2226347e3 / T + 0.240390;

  const x2 = x * x, x3 = x2 * x;
  const y = T < 2222
    ? -1.1063814 * x3 - 1.34811020 * x2 + 2.18555832 * x - 0.20219683
    : T < 4000
      ? -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867
      : 3.0817580 * x3 - 5.87338670 * x2 + 3.75112997 * x - 0.37001483;

  // xyY at Y = 1 -> XYZ -> linear sRGB (D65).
  const X = x / y;
  const Z = (1 - x - y) / y;
  const lr = 3.2404542 * X - 1.5371385 - 0.4985314 * Z;
  const lg = -0.9692660 * X + 1.8760108 + 0.0415560 * Z;
  const lb = 0.0556434 * X - 0.2040259 + 1.0572252 * Z;

  const peak = Math.max(lr, lg, lb, 1e-6);
  return [
    linearToSrgb(Math.max(0, lr / peak)),
    linearToSrgb(Math.max(0, lg / peak)),
    linearToSrgb(Math.max(0, lb / peak)),
  ];
}

/**
 * Interpolate two OKLCh colors through rectangular OKLab, not around the hue
 * wheel.
 *
 * This matters for near-opposite hues. Rotating polar-wise from blue (260°) to
 * gold (85°) passes through a fully saturated cyan at the midpoint — a third
 * colour that belongs to neither end. Going through Lab passes through low
 * chroma instead, so a partial blend of blue and gold is a washed-out blue,
 * which is both what "partly toward gold" should look like and what an anemic
 * disc actually looks like. For nearby hues the two agree closely.
 */
export function mixOklab(a: OKLCh, b: OKLCh, t: number): OKLCh {
  const ar = (a.h * Math.PI) / 180, br = (b.h * Math.PI) / 180;
  const aa = a.C * Math.cos(ar), ab = a.C * Math.sin(ar);
  const ba = b.C * Math.cos(br), bb = b.C * Math.sin(br);

  const na = aa + (ba - aa) * t;
  const nb = ab + (bb - ab) * t;
  const h = (Math.atan2(nb, na) * 180) / Math.PI;

  return {
    L: a.L + (b.L - a.L) * t,
    C: Math.hypot(na, nb),
    h: h < 0 ? h + 360 : h,
  };
}
