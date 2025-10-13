export const ppj = (v: any) => {
  return JSON.stringify(v, null, 2);
};

export const trim = (v: any): string => String(v == null ? '' : v).trim();
