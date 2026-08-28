/**
 * Hard-reject how-to / exploit / PoC / payload / reproduce URLs.
 * News-ticker only: these never land on the public board.
 */

const PATTERNS: RegExp[] = [
  /how[\s._/?#=-]*to[\s._/?#=-]*reproduce/i,
  /how[\s._/?#=-]*to/i,
  /proof[\s._/?#=-]*of[\s._/?#=-]*concept/i,
  /(?:^|[\s._/?#=-])poc(?:$|[\s._/?#=-])/i,
  /payload/i,
  /exploit/i,
];

export function isHardRejectedUrl(raw: string): boolean {
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // keep raw if it is not valid URI encoding
  }
  return PATTERNS.some((pattern) => pattern.test(decoded));
}

export function normalizeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  parsed.hash = "";
  return parsed.toString();
}
