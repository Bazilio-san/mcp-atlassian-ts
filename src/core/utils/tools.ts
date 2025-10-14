export const rn = (x: number, digits: number = 2) => {
  const p = 10 ** digits;
  return Math.round(Number(x) * p) / p;
};

export const getBaseUrl = (input: string): string => {
  const m = input.match(/^([^?#]+?)\/rest\/api\/2\/issue(?:\/|$)/);
  if (!m) {
    return new URL(input).origin;
  }
  return m[1]!;
}
