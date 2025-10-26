// Transliteration functions for project search
// Adapted from multi-bot project

/**
 * Transliteration of Russian text to Latin
 */
export const transliterate = (text: string): string => {
  // noinspection NonAsciiCharacters
  const translitMap: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'kh',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'shch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
    ' ': ' ',
  };

  return text
    .toLowerCase()
    .split('')
    .map(char => translitMap[char] || char)
    .join('');
};

/**
 * Reverse transliteration - from Latin to Cyrillic
 */
export const transliterateRU = (text: string): string => {
  // noinspection NonAsciiCharacters
  const deTranslitMap: Record<string, string> = {
    a: 'а',
    b: 'б',
    v: 'в',
    g: 'г',
    d: 'д',
    e: 'е',
    yo: 'ё',
    zh: 'ж',
    z: 'з',
    i: 'и',
    y: 'й',
    k: 'к',
    l: 'л',
    m: 'м',
    n: 'н',
    o: 'о',
    p: 'п',
    r: 'р',
    s: 'с',
    t: 'т',
    u: 'у',
    f: 'ф',
    kh: 'х',
    ts: 'ц',
    ch: 'ч',
    sh: 'ш',
    shch: 'щ',
    yu: 'ю',
    ya: 'я',
    ' ': ' ',
  };

  let result = text.toLowerCase();

  // Process multi-character combinations in descending order of length
  const multiChar = ['shch', 'kh', 'ts', 'ch', 'sh', 'yo', 'zh', 'yu', 'ya'];
  for (const combo of multiChar) {
    if (deTranslitMap[combo]) {
      result = result.replace(new RegExp(combo, 'g'), deTranslitMap[combo]);
    }
  }

  // Process single-character replacements
  return result
    .split('')
    .map(char => {
      // Check if the character was already replaced by a multi-character combination
      const cyrillic = /[а-я]/i.test(char);
      if (cyrillic) {
        return char;
      }
      return deTranslitMap[char] || char;
    })
    .join('');
};

/**
 * Reverse transliteration - from Latin to Cyrillic (variant)
 * Returns all possible variants considering ambiguous matches.
 *
 * Example:
 *   enToRuVariants("aitech") -> ["аитех", "айтех", "аитеч", "айтек", ...]
 */
export const enToRuVariants = (text: string, maxResults: number = 20): string[] => {
  const s = text.toLowerCase();

  // Priority multi-character Latin clusters
  const clusters = [
    'shch', 'sch', // щ (often sch/shch)
    'yo', 'yu', 'ya',
    'kh', 'ts', 'ch', 'sh',
  ];

  // Mappings of Latin sequences to sets of Russian variants
  const map: Record<string, string[]> = {
    // Multi-character
    shch: ['щ'],
    sch: ['щ', 'шч'], // sometimes passed as шч
    kh: ['х'],
    ts: ['ц'],
    ch: ['ч'],
    sh: ['ш'],
    yo: ['ё', 'йо', 'ио'],
    yu: ['ю', 'йу', 'иу'],
    ya: ['я', 'йа', 'иа'],

    // Single-character (with variants)
    a: ['а'],
    b: ['б'],
    v: ['в'],
    g: ['г'],
    d: ['д'],
    e: ['е', 'э'], // ambiguity e/э
    z: ['з'],
    i: ['и', 'ай', 'й'], // sometimes "i" can sound like "ай" in brands
    y: ['й', 'ы', 'и'], // y is ambiguous
    k: ['к'],
    l: ['л'],
    m: ['м'],
    n: ['н'],
    o: ['о'],
    p: ['п'],
    r: ['р'],
    s: ['с'],
    t: ['т'],
    u: ['у', 'ю'], // sometimes as "ю" (in borrowings)
    f: ['ф'],
    h: ['х'], // single h as "х"
    c: ['к', 'с'], // context-free variant
    j: ['дж', 'ж', 'й'], // jira -> джира/жира
    q: ['к'],
    w: ['в', 'у'],
    x: ['кс', 'з'], // "x" often "кс", sometimes sounds like "з" in borrowings
    ' ': [' '],
    '-': ['-'],
    '_': ['_'],
  };

  // Dynamic programming by positions with branching by variants
  const results: string[] = [];

  const backtrack = (idx: number, acc: string) => {
    if (results.length >= maxResults) {
      return;
    }
    if (idx >= s.length) {
      results.push(acc);
      return;
    }

    // Пробуем многобуквенные кластеры (самые длинные сначала)
    for (const cluster of clusters.sort((a, b) => b.length - a.length)) {
      if (s.startsWith(cluster, idx)) {
        const variants = map[cluster];
        if (variants) {
          for (const v of variants) {
            backtrack(idx + cluster.length, acc + v);
            if (results.length >= maxResults) {
              return;
            }
          }
          return; // если совпал кластер — не распадаем его на одиночные буквы
        }
      }
    }

    // Если многобуквенные не подошли — однобуквенная буква
    const ch = s[idx];
    const variants = (ch && map[ch]) || [ch];
    for (const v of variants) {
      backtrack(idx + 1, acc + v);
      if (results.length >= maxResults) {
        return;
      }
    }
  };

  backtrack(0, '');
  // Уберём дубликаты и отсортируем по длине (короче — выше)
  const uniq = Array.from(new Set(results));
  uniq.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return uniq;
};
