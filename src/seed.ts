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
