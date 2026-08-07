// ============================================================================
// Celestial Generator — Seed Derivation (integer hash)
// ============================================================================

/**
 * Derive a per-layer seed from a base seed using integer bit-mixing.
 * Replaces the sin-based deriveSeed which had correlation artifacts
 * for nearby seed values.
 *
 * @param base  Base seed (any number, will be truncated to integer).
 * @param layer Layer index (1-6).
 * @returns Seed value in [0.1, 100.1] for shader uniform compatibility.
 */
export function hashSeed(base: number, layer: number): number {
  let h = (Math.imul((base | 0), 2654435761) + Math.imul((layer | 0), 2246822519)) | 0;
  h = Math.imul(((h >>> 16) ^ h), 0x45d9f3b);
  h = Math.imul(((h >>> 16) ^ h), 0x45d9f3b);
  h = ((h >>> 16) ^ h);
  return ((h >>> 0) % 10000) / 100 + 0.1;
}

/**
 * Derive a uniform value in [0, 1) from a seed and layer index.
 *
 * `hashSeed` lands on X/100 + 0.1 for integer X in [0, 9999], so undoing that
 * offset recovers all 10000 states — where taking `hashSeed(...) % 1` would
 * throw away half the entropy and leave only 100 distinct values.
 *
 * @param base  Base seed.
 * @param layer Layer index. Use 13+ to stay clear of the six shader layers.
 */
export function unitFromSeed(base: number, layer: number): number {
  const u = (hashSeed(base, layer) - 0.1) / 100;
  return Math.min(0.999999, Math.max(0, u));
}

/**
 * Derive a viewing inclination from a seed, inside a designer-set range.
 * Lets a generated system get varied tilts without per-body authoring.
 *
 * Layers 11 and 12 are combined so the result stays uncorrelated with the
 * six layer seeds the shader already consumes.
 *
 * @param base   Base seed.
 * @param minDeg Lower bound in degrees (0 = face-on).
 * @param maxDeg Upper bound in degrees (~80 = near edge-on).
 * @returns Inclination in degrees, within [minDeg, maxDeg].
 */
export function inclinationFor(base: number, minDeg: number, maxDeg: number): number {
  const u = ((hashSeed(base, 11) % 1) + hashSeed(base, 12) / 100) % 1;
  return minDeg + (maxDeg - minDeg) * u;
}
