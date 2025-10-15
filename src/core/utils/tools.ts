export const rn = (x: number, digits: number = 2) => {
  const p = 10 ** digits;
  return Math.round(Number(x) * p) / p;
};

export const getBaseUrl = (input: string): string => {
  const m = input.match(/^(https?:\/\/[^\/?#]+)/i);
  return m?.[1] || input;
}
