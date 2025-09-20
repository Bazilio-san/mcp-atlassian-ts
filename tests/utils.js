export const incl = (text, search) => String(text || '').includes(search);
export const inclOneOf = (text, ...searches) => {
  const t = String(text || '');
  return searches.some((search) => t.includes(search));
};
export const isObj = (v) => v && typeof v === 'object';

