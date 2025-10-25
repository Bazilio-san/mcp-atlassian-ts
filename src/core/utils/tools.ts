import { ValidationError } from '../errors.js';

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

  // регулярка: ищем по первым вхождениям w, d, h, m — с дробной частью возможно
  const regex = /(\d+(?:[.,]\d+)?)(\s*)([wdhm])/gi;
  const found: { [key: string]: number } = {};
  let match;
  while ((match = regex.exec(orig)) !== null) {
    const rawNum = match[1]!.replace(',', '.');
    const unit: string = match[3]!.toLowerCase();
    // если сразу нашли эту единицу ранее — игнорируем повтор
    if (!(unit in found)) {
      found[unit] = parseFloat(rawNum);
    }
  }

  // если ничего не найдено — ошибка
  if (Object.keys(found).length === 0) {
    throw new ValidationError(`Invalid format${forWhat}: '${input
    }'. No valid time units found. Valid format: NN<unit> where unit is w | d | h | m`);
  }

  // Теперь переводим дробную части в меньшие единицы:
  // порядок: w → d → h → m
  // Допустим: 1w = 5d (по Jira), 1d = 8h, 1h = 60m, 1m = 60s (хотя минуты → секунды отдельный шаг)
  // Поскольку точных правил (сколько рабочих дней/часов) могут быть разные, примем:
  const DAYS_PER_WEEK = 5;
  const HOURS_PER_DAY = 8;
  const MINUTES_PER_HOUR = 60;
  const SECONDS_PER_MINUTE = 60;

  // Берём только первое вхождение каждого unit (нашли выше)
  let weeks = found.w || 0;
  let days = found.d || 0;
  let hours = found.h || 0;
  let minutes = found.m || 0;

  // переносим дробную части вниз
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
  // minutes: тут округляем до целого
  minutes = Math.round(minutes);

  // теперь возмож, что minutes >= MINUTES_PER_HOUR → перенос в hours
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

  // строим строку нормализованную
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
  // если всё ноль — добавить «0m»
  if (parts.length === 0) {
    parts.push('0m');
  }
  const normalized = parts.join(' ');

  // считаем секунды
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
