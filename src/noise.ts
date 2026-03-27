// ============================================================================
// Noise Texture — procedural fallback + external loader
// ============================================================================

/**
 * Generate a deterministic procedural radial noise texture using Canvas 2D.
 * Used as a built-in fallback for the black hole accretion disk.
 *
 * @param size Texture dimensions (default 128).
 * @returns HTMLCanvasElement containing the noise pattern.
 */
export function generateFallbackNoise(size = 128): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deterministic seeded RNG (simple LCG)
  let seed = 48271;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Fill with base gray
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, size, size);

  // Draw radial noise circles
  const cx = size / 2;
  const cy = size / 2;
  const count = size * 8;
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * size * 0.5;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const r = rng() * size * 0.08 + 1;
    const v = Math.floor(80 + rng() * 96);
    const a = 0.1 + rng() * 0.3;
    ctx.fillStyle = `rgba(${v},${v},${v},${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radial fade to edge
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  g.addColorStop(0, 'rgba(128,128,128,0)');
  g.addColorStop(0.7, 'rgba(128,128,128,0)');
  g.addColorStop(1, 'rgba(128,128,128,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  return canvas;
}

/**
 * Load a noise texture image from a URL.
 * @returns Promise resolving to the loaded HTMLImageElement.
 */
export function loadNoiseImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load noise texture: ${src}`));
    img.src = src;
  });
}
