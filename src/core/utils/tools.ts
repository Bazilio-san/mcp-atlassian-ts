import { ValidationError } from '../errors/ValidationError.js';

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
 * @param validationMessage
 * @returns ISO UTC datetime string (e.g., "2025-10-18T00:55:41.128Z")
 */
export const convertToIsoUtc = (
  datetimeWithTimezone?: string | number | Date,
  validationMessage?: string,
): any => {
  if (!datetimeWithTimezone) {
    return datetimeWithTimezone;
  }
  if (typeof datetimeWithTimezone === 'string' || typeof datetimeWithTimezone === 'number') {
    try {
      const date = new Date(datetimeWithTimezone);
      return date.toISOString();
    } catch {
      if (validationMessage) {
        throw new ValidationError(validationMessage);
      }
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

/**
 * Expand string or array to comma-separated string
 */
export const expandStringOrArray = (value: string | string[] | undefined, separator: string = ','): string | undefined => {
  if (!value) {
    return undefined;
  }
  const arr = normalizeToArray(value);
  return arr.length > 0 ? arr.join(separator) : undefined;
};

export const isObject = (o: any): boolean => (o && typeof o === 'object');

export const isNonEmptyObject = (o: any): boolean => isObject(o) && !Array.isArray(o) && Object.values(o).some((v) => v !== undefined);

export const parseAndNormalizeTimeSpent = (input: any, what?: string): { normalized: string, seconds: number } => {
  const forWhat = what ? ` for ${what}` : '';
  if (typeof input !== 'string') {
    throw new ValidationError(`Invalid input${forWhat}: must be a string`);
  }
  const orig = input.trim();
  if (orig === '') {
    throw new ValidationError(`Invalid input${forWhat}: empty string`);
  }

  // regex: search for first occurrences of w, d, h, m — fractional part possible
  const regex = /(\d+(?:[.,]\d+)?)(\s*)([wdhm])/gi;
  const found: { [key: string]: number } = {};
  let match;
  while ((match = regex.exec(orig)) !== null) {
    const rawNum = match[1]!.replace(',', '.');
    const unit: string = match[3]!.toLowerCase();
    // if this unit was already found earlier — ignore duplicate
    if (!(unit in found)) {
      found[unit] = parseFloat(rawNum);
    }
  }

  // if nothing found — error
  if (Object.keys(found).length === 0) {
    throw new ValidationError(`Invalid format${forWhat}: '${input
    }'. No valid time units found. Valid format: NN<unit> where unit is w | d | h | m`);
  }

  // Now convert fractional parts to smaller units:
  // order: w → d → h → m
  // Assuming: 1w = 5d (per Jira), 1d = 8h, 1h = 60m, 1m = 60s (although minutes → seconds is a separate step)
  // Since exact rules (how many working days/hours) may vary, we'll use:
  const DAYS_PER_WEEK = 5;
  const HOURS_PER_DAY = 8;
  const MINUTES_PER_HOUR = 60;
  const SECONDS_PER_MINUTE = 60;

  // Take only the first occurrence of each unit (found above)
  let weeks = found.w || 0;
  let days = found.d || 0;
  let hours = found.h || 0;
  let minutes = found.m || 0;

  // carry fractional parts down
  // weeks → days
  if (weeks % 1 !== 0) {
    const intW = Math.floor(weeks);
    const fracW = weeks - intW;
    weeks = intW;
    days += fracW * DAYS_PER_WEEK;
  }
  // days → hours
  if (days % 1 !== 0) {
    const intD = Math.floor(days);
    const fracD = days - intD;
    days = intD;
    hours += fracD * HOURS_PER_DAY;
  }
  // hours → minutes
  if (hours % 1 !== 0) {
    const intH = Math.floor(hours);
    const fracH = hours - intH;
    hours = intH;
    minutes += fracH * MINUTES_PER_HOUR;
  }
  // minutes: round to integer
  minutes = Math.round(minutes);

  // now it's possible that minutes >= MINUTES_PER_HOUR → carry to hours
  if (minutes >= MINUTES_PER_HOUR) {
    const extraH = Math.floor(minutes / MINUTES_PER_HOUR);
    hours += extraH;
    minutes = minutes % MINUTES_PER_HOUR;
  }
  // hours → days
  if (hours >= HOURS_PER_DAY) {
    const extraD = Math.floor(hours / HOURS_PER_DAY);
    days += extraD;
    hours = hours % HOURS_PER_DAY;
  }
  // days → weeks
  if (days >= DAYS_PER_WEEK) {
    const extraW = Math.floor(days / DAYS_PER_WEEK);
    weeks += extraW;
    days = days % DAYS_PER_WEEK;
  }

  // build normalized string
  const parts = [];
  if (weeks) {
    parts.push(weeks + 'w');
  }
  if (days) {
    parts.push(days + 'd');
  }
  if (hours) {
    parts.push(hours + 'h');
  }
  if (minutes) {
    parts.push(minutes + 'm');
  }
  // if everything is zero — add "0m"
  if (parts.length === 0) {
    parts.push('0m');
  }
  const normalized = parts.join(' ');

  // calculate seconds
  let seconds = 0;
  seconds += weeks * DAYS_PER_WEEK * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
  seconds += days * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
  seconds += hours * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
  seconds += minutes * SECONDS_PER_MINUTE;

  return {
    normalized,
    seconds,
  };
};

export const validateDate = (d: any, where?: string) => {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw new ValidationError(`${where ? `${where}. ` : ''}Invalid date: must be a string of format YYYY-MM-DD`);
  }
};
