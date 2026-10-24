export function contourPath(
  cx: number,
  cy: number,
  r: number,
  phase: number,
  steps = 96,
  xScale = 1.16
): string {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const k =
      1 +
      0.13 * Math.sin(3 * a + phase) +
      0.07 * Math.sin(5 * a + phase * 1.7) +
      0.04 * Math.sin(9 * a + phase * 0.6);
    const x = cx + Math.cos(a) * r * k * xScale;
    const y = cy + Math.sin(a) * r * k;
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

export function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const clean = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
  };
  const from = parse(a);
  const to = parse(b);
  const clamped = Math.max(0, Math.min(1, t));
  return `#${from
    .map((v, i) => Math.round(v + (to[i] - v) * clamped).toString(16).padStart(2, '0'))
    .join('')}`;
}
