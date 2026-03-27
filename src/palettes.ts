// ============================================================================
// Celestial Generator — Default Palettes, Color Slots & Loop Periods
// ============================================================================

import { CelestialType, RGBA } from './types.js';

/** Default color palettes per celestial type. Values are RGBA in [0, 1]. */
export const PALETTES: Record<string, Record<string, RGBA>> = {
  [CelestialType.TerrainWet]: {
    base1: [0.400, 0.690, 0.780, 1], base2: [0.400, 0.690, 0.780, 1], base3: [0.204, 0.255, 0.616, 1],
    land1: [0.784, 0.831, 0.365, 1], land2: [0.388, 0.671, 0.247, 1], land3: [0.184, 0.341, 0.325, 1], land4: [0.157, 0.208, 0.251, 1],
    cloud1: [0.882, 0.949, 1.000, 1], cloud2: [0.753, 0.890, 1.000, 1], cloud3: [0.369, 0.439, 0.647, 1], cloud4: [0.251, 0.286, 0.451, 1],
    atmo1: [0.678, 0.847, 0.902, 0.25], atmo2: [0.000, 0.498, 1.000, 0.35], atmo3: [0.000, 0.000, 0.502, 0.45],
  },
  [CelestialType.TerrainDry]: {
    col1: [0.960, 0.850, 0.630, 1], col2: [0.850, 0.650, 0.400, 1], col3: [0.580, 0.380, 0.260, 1], col4: [0.350, 0.220, 0.200, 1],
  },
  [CelestialType.Aquatic]: {
    base1: [0.157, 0.380, 0.690, 1], base2: [0.118, 0.286, 0.580, 1], base3: [0.078, 0.176, 0.420, 1],
    land1: [0.388, 0.671, 0.247, 1], land2: [0.255, 0.502, 0.216, 1], land3: [0.184, 0.341, 0.325, 1], land4: [0.118, 0.220, 0.259, 1],
    cloud1: [0.882, 0.949, 1.000, 1], cloud2: [0.753, 0.890, 1.000, 1], cloud3: [0.369, 0.439, 0.647, 1], cloud4: [0.251, 0.286, 0.451, 1],
    atmo1: [0.400, 0.700, 0.900, 0.25], atmo2: [0.100, 0.400, 0.800, 0.35], atmo3: [0.050, 0.150, 0.500, 0.45],
  },
  [CelestialType.Barren]: {
    base1: [0.608, 0.620, 0.722, 1], base2: [0.278, 0.380, 0.486, 1], base3: [0.208, 0.224, 0.333, 1],
    crater1: [0.278, 0.380, 0.486, 1], crater2: [0.208, 0.224, 0.333, 1],
  },
  [CelestialType.GasGiant]: {
    gas_base1: [0.941, 0.710, 0.255, 1], gas_base2: [0.812, 0.459, 0.169, 1], gas_base3: [0.671, 0.318, 0.188, 1], gas_base4: [0.490, 0.220, 0.200, 1],
    gas_dark1: [0.231, 0.125, 0.153, 1], gas_dark2: [0.231, 0.125, 0.153, 1], gas_dark3: [0.129, 0.094, 0.106, 1], gas_dark4: [0.129, 0.094, 0.106, 1],
  },
  [CelestialType.GasGiantRinged]: {
    gas1: [0.941, 0.710, 0.255, 1], gas2: [0.812, 0.459, 0.169, 1], gas3: [0.671, 0.318, 0.188, 1], gas4: [0.490, 0.220, 0.200, 1],
    gas_dark1: [0.231, 0.125, 0.153, 1], gas_dark2: [0.200, 0.110, 0.140, 1], gas_dark3: [0.129, 0.094, 0.106, 1], gas_dark4: [0.100, 0.070, 0.090, 1],
    ring1: [0.941, 0.780, 0.450, 1], ring2: [0.812, 0.560, 0.300, 1], ring3: [0.580, 0.350, 0.200, 1], ring4: [0.350, 0.200, 0.150, 1],
  },
  [CelestialType.Molten]: {
    base1: [0.561, 0.302, 0.341, 1], base2: [0.322, 0.200, 0.247, 1], base3: [0.239, 0.161, 0.212, 1],
    crater1: [0.322, 0.200, 0.247, 1], crater2: [0.239, 0.161, 0.212, 1],
    river1: [1.000, 0.537, 0.200, 1], river2: [0.902, 0.271, 0.224, 1], river3: [0.678, 0.184, 0.271, 1],
  },
  [CelestialType.Ice]: {
    base1: [0.980, 1.000, 1.000, 1], base2: [0.780, 0.831, 1.000, 1], base3: [0.573, 0.561, 0.722, 1],
    lake1: [0.310, 0.643, 0.722, 1], lake2: [0.298, 0.408, 0.522, 1], lake3: [0.227, 0.247, 0.369, 1],
    cloud1: [0.882, 0.949, 1.000, 1], cloud2: [0.753, 0.890, 1.000, 1], cloud3: [0.369, 0.439, 0.647, 1], cloud4: [0.251, 0.286, 0.451, 1],
  },
  [CelestialType.Star]: {
    star1: [1.000, 0.950, 0.500, 1], star2: [1.000, 0.700, 0.200, 1], star3: [0.900, 0.350, 0.100, 1], star4: [0.600, 0.150, 0.050, 1],
    blob: [1.000, 0.647, 0.000, 1.000],
    glow: [1.000, 0.600, 0.150, 1.000],
  },
  [CelestialType.BlackHole]: {
    glow1: [1.000, 0.902, 0.784, 1], glow2: [0.980, 0.588, 0.353, 1],
    glow3: [0.973, 0.353, 0.137, 1], glow4: [0.667, 0.039, 0.031, 1],
    purple: [0.498, 0.004, 0.498, 1],
    rim: [1.000, 0.816, 0.694, 1], inset: [0.867, 0.686, 0.765, 1],
  },
  [CelestialType.Galaxy]: {
    core: [1.000, 0.960, 0.800, 1], arm1: [0.400, 0.500, 0.900, 1], arm2: [0.300, 0.350, 0.700, 1], dust: [0.150, 0.100, 0.200, 1],
  },
};

/** Ordered color slot names per type, mapping to u_col0, u_col1, ... */
export const COLOR_SLOTS: Record<string, string[]> = {
  [CelestialType.TerrainWet]: ['base1','base2','base3','land1','land2','land3','land4','cloud1','cloud2','cloud3','cloud4','atmo1','atmo2','atmo3'],
  [CelestialType.TerrainDry]: ['col1','col2','col3','col4'],
  [CelestialType.Aquatic]: ['base1','base2','base3','land1','land2','land3','land4','cloud1','cloud2','cloud3','cloud4','atmo1','atmo2','atmo3'],
  [CelestialType.Barren]: ['base1','base2','base3','crater1','crater2'],
  [CelestialType.GasGiant]: ['gas_base1','gas_base2','gas_base3','gas_base4','gas_dark1','gas_dark2','gas_dark3','gas_dark4'],
  [CelestialType.GasGiantRinged]: ['gas1','gas2','gas3','gas4','gas_dark1','gas_dark2','gas_dark3','gas_dark4','ring1','ring2','ring3','ring4'],
  [CelestialType.Molten]: ['base1','base2','base3','crater1','crater2','river1','river2','river3'],
  [CelestialType.Ice]: ['base1','base2','base3','lake1','lake2','lake3','cloud1','cloud2','cloud3','cloud4'],
  [CelestialType.Star]: ['star1','star2','star3','star4','blob','glow'],
  [CelestialType.BlackHole]: ['glow1','glow2','glow3','glow4','purple','rim','inset'],
  [CelestialType.Galaxy]: ['core','arm1','arm2','dust'],
};

/** Loop period LCMs (noise wrap sizes across all layers) for seamless animation. */
export const LOOP_LCMS: Record<string, number> = {
  [CelestialType.TerrainWet]: 20,
  [CelestialType.TerrainDry]: 10,
  [CelestialType.Aquatic]: 20,
  [CelestialType.Barren]: 10,
  [CelestialType.GasGiant]: 9,
  [CelestialType.GasGiantRinged]: 75,
  [CelestialType.Molten]: 10,
  [CelestialType.Ice]: 20,
  [CelestialType.Star]: 60,
  [CelestialType.BlackHole]: 10,
  [CelestialType.Galaxy]: 20,
  [CelestialType.Nebula]: 0,
};
