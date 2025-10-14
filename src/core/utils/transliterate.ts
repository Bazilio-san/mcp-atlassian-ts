// Функции транслитерации для поиска по проектам
// Адаптировано из multi-bot проекта

/**
 * Транслитерация русского текста в латиницу
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
 * Обратная транслитерация - из латиницы в кириллицу
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

  // Обрабатываем многобуквенные комбинации в порядке убывания длины
  const multiChar = ['shch', 'kh', 'ts', 'ch', 'sh', 'yo', 'zh', 'yu', 'ya'];
  for (const combo of multiChar) {
    if (deTranslitMap[combo]) {
      result = result.replace(new RegExp(combo, 'g'), deTranslitMap[combo]);
    }
  }

  // Обрабатываем однобуквенные замены
  return result
    .split('')
    .map(char => {
      // Проверяем, не была ли буква уже заменена многобуквенной комбинацией
      const cyrillic = /[а-я]/i.test(char);
      if (cyrillic) {
        return char;
      }
      return deTranslitMap[char] || char;
    })
    .join('');
};

/**
 * Обратная транслитерация - из латиницы в кириллицу (вариативная)
 * Возвращает все возможные варианты с учётом неоднозначных соответствий.
 *
 * Пример:
 *   enToRuVariants("aitech") -> ["аитех", "айтех", "аитеч", "айтек", ...]
 */
export const enToRuVariants = (text: string, maxResults: number = 20): string[] => {
  const s = text.toLowerCase();

  // Приоритетные многобуквенные латинские кластеры
  const clusters = [
    'shch', 'sch', // щ (часто sch/shch)
    'yo', 'yu', 'ya',
    'kh', 'ts', 'ch', 'sh',
  ];

  // Соответствия латинских последовательностей множеству русских вариантов
  const map: Record<string, string[]> = {
    // Многобуквенные
    shch: ['щ'],
    sch: ['щ', 'шч'], // иногда передаётся как шч
    kh: ['х'],
    ts: ['ц'],
    ch: ['ч'],
    sh: ['ш'],
    yo: ['ё', 'йо', 'ио'],
    yu: ['ю', 'йу', 'иу'],
    ya: ['я', 'йа', 'иа'],

    // Однобуквенные (с вариантами)
    a: ['а'],
    b: ['б'],
    v: ['в'],
    g: ['г'],
    d: ['д'],
    e: ['е', 'э'], // неоднозначность e/э
    z: ['з'],
    i: ['и', 'ай', 'й'], // иногда "i" может звучать как "ай" в брендах
    y: ['й', 'ы', 'и'], // y неоднозначна
    k: ['к'],
    l: ['л'],
    m: ['м'],
    n: ['н'],
    o: ['о'],
    p: ['п'],
    r: ['р'],
    s: ['с'],
    t: ['т'],
    u: ['у', 'ю'], // иногда как "ю" (в заимств.)
    f: ['ф'],
    h: ['х'], // одиночная h как "х"
    c: ['к', 'с'], // context-free вариант
    j: ['дж', 'ж', 'й'], // jira -> джира/жира
    q: ['к'],
    w: ['в', 'у'],
    x: ['кс', 'з'], // "x" часто "кс", иногда звучит как "з" в заимств.
    ' ': [' '],
    '-': ['-'],
    '_': ['_'],
  };

  // ДП по позициям с разветвлением по вариантам
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
