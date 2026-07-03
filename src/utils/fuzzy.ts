/**
 * Client-side fuzzy matcher mirroring the Rust implementation
 * (used for command palette / GoTo where the list already lives in memory).
 */
/** Case/accent-insensitive fold (Turkish ı/İ safe), mirroring the Rust side. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

export function fuzzyScore(pattern: string, text: string): number | null {
  if (!pattern) return 0;
  const pat = fold(pattern);
  const txt = fold(text);
  if (pat.length > txt.length) return null;

  let total = 0;
  let pi = 0;
  let streak = 0;
  let gaps = 0;

  const isBoundary = (prev: string | undefined) =>
    prev === undefined ||
    prev === " " ||
    prev === "_" ||
    prev === "-" ||
    prev === "." ||
    prev === "/" ||
    prev === "\\";

  for (let ti = 0; ti < txt.length && pi < pat.length; ti++) {
    if (txt[ti] === pat[pi]) {
      let gain = 4;
      if (streak > 0) gain += 12 + streak * 2;
      if (isBoundary(ti === 0 ? undefined : txt[ti - 1])) gain += ti === 0 ? 24 : 20;
      total += gain;
      streak += 1;
      pi += 1;
    } else {
      if (pi > 0) gaps += 1;
      streak = 0;
    }
  }
  if (pi < pat.length) return null;
  total -= gaps;
  total -= Math.floor(txt.length / 8);
  return total;
}
