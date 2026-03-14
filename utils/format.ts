const DEFAULT_LOCALE = "en-US";
const DEFAULT_CURRENCY = "USD";

// Cache for Intl formatters to avoid expensive re-instantiation
const numberFormatterCache = new Map<string, Intl.NumberFormat>();
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

export type MoneyFormatOptions = {
  currency?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  useGrouping?: boolean;
};

export function formatCurrency(
  value: number,
  {
    currency = DEFAULT_CURRENCY,
    maximumFractionDigits,
    minimumFractionDigits,
    useGrouping,
  }: MoneyFormatOptions = {},
): string {
  const resolvedMaxFractionDigits =
    maximumFractionDigits !== undefined
      ? maximumFractionDigits
      : Math.abs(value) >= 1000
        ? 0
        : 2;

  const cacheKey = `${currency}-${resolvedMaxFractionDigits}-${minimumFractionDigits}-${useGrouping}`;

  let formatter = numberFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: "currency",
      currency,
      maximumFractionDigits: resolvedMaxFractionDigits,
      minimumFractionDigits,
      useGrouping,
    });
    numberFormatterCache.set(cacheKey, formatter);
  }

  return formatter.format(value);
}

export type DateFormatOptions = {
  month?: "short" | "long" | "numeric";
  day?: "numeric" | "2-digit";
  year?: "numeric" | "2-digit";
};

export function formatDate(
  value: Date | string | number,
  options: DateFormatOptions = { month: "short", day: "numeric" },
): string {
  const date = value instanceof Date ? value : new Date(value);

  const cacheKey = JSON.stringify(options);

  let formatter = dateFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, options);
    dateFormatterCache.set(cacheKey, formatter);
  }

  return formatter.format(date);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return (value * 100).toFixed(fractionDigits) + "%";
}
