export const ppj = (v: any) => {
  return JSON.stringify(v, null, 2);
};

export const trim = (v: any): string => String(v == null ? '' : v).trim();

/**
 * Простая транслитерация русского текста
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
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };

  return text.toLowerCase().split('').map((char) => translitMap[char] || char).join('');
};
// ... existing code ...

/**
 * Обратная транслитерация с латиницы на кириллицу
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
    h: 'х',
    ts: 'ц',
    ch: 'ч',
    sh: 'ш',
    sch: 'щ',
    yu: 'ю',
    ya: 'я',
  };

  // Сначала заменяем многосимвольные сочетания (порядок важен)
  let result = text.toLowerCase();

  // Порядок важен - сначала самые длинные сочетания
  const sortedKeys = Object.keys(deTranslitMap).sort((a, b) => b.length - a.length);

  sortedKeys.forEach((latinChar) => {
    const cyrillicChar = deTranslitMap[latinChar];
    const regex = new RegExp(latinChar, 'g');
    result = cyrillicChar ? result.replace(regex, cyrillicChar) : result;
  });

  return result;
};
