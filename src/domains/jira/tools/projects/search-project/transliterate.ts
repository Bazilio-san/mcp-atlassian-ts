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
      if (cyrillic) return char;
      return deTranslitMap[char] || char;
    })
    .join('');
};