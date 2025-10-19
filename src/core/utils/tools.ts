export const rn = (x: number, digits: number = 2) => {
  const p = 10 ** digits;
  return Math.round(Number(x) * p) / p;
};

export const getBaseUrl = (input: string): string => {
  const m = input.match(/^(https?:\/\/[^\/?#]+)/i);
  return m?.[1] || input;
};

/**
 * Converts a timezone-aware datetime string to ISO UTC format
 * @param datetimeWithTimezone - DateTime string with timezone (e.g., "2025-10-18T03:55:41.128+0300")
 * @returns ISO UTC datetime string (e.g., "2025-10-18T00:55:41.128Z")
 */
export const convertToIsoUtc = (datetimeWithTimezone?: string | number | Date): any => {
  if (!datetimeWithTimezone) {
    return datetimeWithTimezone;
  }
  if (typeof datetimeWithTimezone === 'string' || typeof datetimeWithTimezone === 'number') {
    try {
      const date = new Date(datetimeWithTimezone);
      return date.toISOString();
    } catch {
      return undefined;
    }
  }
};

/**
 * Normalize string or array parameter to array
 */
export const normalizeToArray = (value: string | string[] | undefined): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
};
