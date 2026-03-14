export type FredSeriesPoint = {
  date: string;
  value: number;
};

export function parseFredSeries(csv: string): FredSeriesPoint[] {
  const lines = csv
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const points: FredSeriesPoint[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const columns = lines[index]?.split(",");
    if (!columns || columns.length < 2) continue;
    const date = columns[0]?.trim();
    const rawValue = columns[1]?.trim();
    if (!date || !rawValue || rawValue === ".") continue;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) continue;
    points.push({ date, value: parsed });
  }

  return points;
}

export function parseLatestFredValue(csv: string): number | null {
  const points = parseFredSeries(csv);
  if (points.length === 0) return null;
  return points[points.length - 1]?.value ?? null;
}

export function computeYearOverYearInflation(
  points: FredSeriesPoint[],
): number | null {
  if (points.length < 13) return null;
  const latest = points[points.length - 1]?.value;
  const oneYearAgo = points[points.length - 13]?.value;
  if (
    !Number.isFinite(latest) ||
    !Number.isFinite(oneYearAgo) ||
    !oneYearAgo ||
    oneYearAgo <= 0
  ) {
    return null;
  }
  return (latest - oneYearAgo) / oneYearAgo;
}

export function toDecimalPercent(percentValue: number): number {
  if (percentValue === 0) return percentValue;
  const decimal = percentValue / 100;
  return Number(decimal.toFixed(6));
}
