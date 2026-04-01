/**
 * Conservative search expansion — only direct synonyms / alternate spellings.
 * Keeps results tightly relevant to the user's actual query.
 */

// Each entry maps a keyword to its CLOSE synonyms only.
// These are terms that mean essentially the same role — not loosely related roles.
const SYNONYM_MAP: Record<string, string[]> = {
  developer: ["engineer", "programmer"],
  engineer: ["developer"],
  programmer: ["developer", "engineer"],
  analyst: ["analytics"],
  analytics: ["analyst"],
  designer: ["design"],
  design: ["designer"],
  tester: ["qa", "quality assurance"],
  qa: ["tester", "quality assurance", "sdet"],
  sdet: ["qa", "tester"],
  devops: ["sre", "site reliability"],
  sre: ["devops", "site reliability"],
  frontend: ["front end", "front-end"],
  backend: ["back end", "back-end"],
  fullstack: ["full stack", "full-stack"],
  "full stack": ["fullstack", "full-stack"],
  mobile: ["ios", "android"],
  ml: ["machine learning"],
  "machine learning": ["ml"],
  ai: ["artificial intelligence"],
  "artificial intelligence": ["ai"],
  ui: ["ux", "ui/ux"],
  ux: ["ui", "ui/ux"],
  "ui/ux": ["ui", "ux"],
  dba: ["database administrator"],
  "database administrator": ["dba"],
  pm: ["product manager", "project manager"],
};

/**
 * Returns a small set of close synonyms for the search query.
 * Intentionally conservative to avoid polluting results.
 */
export function expandSearchTerms(query: string): string[] {
  if (!query || !query.trim()) return [];

  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/[\s,/\-_]+/).filter(w => w.length > 1);
  const expanded = new Set<string>();

  // Check full query as a phrase first
  if (SYNONYM_MAP[normalized]) {
    SYNONYM_MAP[normalized].forEach(s => expanded.add(s));
  }

  // Check individual words — only exact key matches
  for (const word of words) {
    if (SYNONYM_MAP[word]) {
      SYNONYM_MAP[word].forEach(s => expanded.add(s));
    }
  }

  // Remove any terms that are already in the original query
  for (const word of words) {
    expanded.delete(word);
  }
  expanded.delete(normalized);

  // Filter short/identical terms
  return [...expanded].filter(t => t.length > 1).slice(0, 5);
}
