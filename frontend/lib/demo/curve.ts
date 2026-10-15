/**
 * Tracé lissé passant par chaque point, monotone entre deux points
 * (Fritsch–Carlson) : ni dépassement sous zéro, ni bosse qui n'existe pas.
 */
export function curve(points: [number, number][]): string {
  const n = points.length;
  if (n < 2) return "";
  const x = points.map((p) => p[0]);
  const y = points.map((p) => p[1]);
  const slope = x.slice(1).map((xi, i) => (y[i + 1] - y[i]) / (xi - x[i]));
  const tangent = x.map((_, i) =>
    i === 0 ? slope[0] : i === n - 1 ? slope[n - 2] : slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  );
  slope.forEach((s, i) => {
    if (s === 0) {
      tangent[i] = tangent[i + 1] = 0;
      return;
    }
    const a = tangent[i] / s;
    const b = tangent[i + 1] / s;
    const h = a * a + b * b;
    if (h > 9) {
      tangent[i] = (3 * a * s) / Math.sqrt(h);
      tangent[i + 1] = (3 * b * s) / Math.sqrt(h);
    }
  });
  let d = `M${x[0].toFixed(1)},${y[0].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const third = (x[i + 1] - x[i]) / 3;
    d += `C${(x[i] + third).toFixed(1)},${(y[i] + tangent[i] * third).toFixed(2)} ${(x[i + 1] - third).toFixed(1)},${(y[i + 1] - tangent[i + 1] * third).toFixed(2)} ${x[i + 1].toFixed(1)},${y[i + 1].toFixed(2)}`;
  }
  return d;
}
