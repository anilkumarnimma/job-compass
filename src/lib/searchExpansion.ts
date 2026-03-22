/**
 * Dynamic role-family expansion for intelligent job search.
 * Generates related terms for ANY keyword without relying on hardcoded mappings.
 */

// Core role families — used as seed knowledge, NOT as exhaustive lists.
// The expansion logic works for ANY keyword, even ones not listed here.
const ROLE_FAMILIES: Record<string, string[]> = {
  developer: ["engineer", "programmer", "coder", "full stack", "frontend", "backend", "mobile", "web", "software", "application"],
  engineer: ["developer", "architect", "sre", "devops", "platform", "infrastructure", "systems", "reliability", "cloud"],
  analyst: ["analytics", "business analyst", "data analyst", "reporting", "intelligence", "insights", "research", "quantitative"],
  designer: ["ux", "ui", "product designer", "visual", "graphic", "interaction", "experience", "creative"],
  manager: ["lead", "director", "head", "coordinator", "supervisor", "vp", "chief", "principal"],
  architect: ["engineer", "solutions", "enterprise", "technical", "systems", "cloud", "infrastructure"],
  consultant: ["advisor", "specialist", "strategist", "practitioner"],
  tester: ["qa", "quality", "sdet", "test engineer", "automation", "quality assurance"],
  admin: ["administrator", "operations", "coordinator", "support", "helpdesk"],
  scientist: ["researcher", "machine learning", "ai", "deep learning", "nlp", "data science"],
  marketing: ["growth", "seo", "content", "brand", "digital marketing", "communications", "social media"],
  sales: ["account", "business development", "revenue", "partnerships", "customer success"],
  security: ["cybersecurity", "infosec", "penetration", "compliance", "risk", "soc"],
  devops: ["sre", "platform", "infrastructure", "ci/cd", "cloud", "kubernetes", "docker", "reliability"],
  data: ["database", "etl", "pipeline", "warehouse", "bi", "analytics", "big data", "spark"],
  product: ["product manager", "product owner", "program manager", "scrum master", "agile"],
  support: ["customer success", "helpdesk", "service desk", "technical support", "customer service"],
  writer: ["content", "copywriter", "technical writer", "editor", "documentation"],
  recruiter: ["talent", "sourcing", "hr", "people", "hiring"],
  finance: ["accounting", "financial", "controller", "treasury", "audit", "tax", "bookkeeper"],
};

// Bidirectional keyword associations for dynamic expansion
const KEYWORD_ASSOCIATIONS: Record<string, string[]> = {
  frontend: ["react", "angular", "vue", "javascript", "typescript", "css", "html", "ui"],
  backend: ["api", "server", "node", "python", "java", "golang", "microservices", "rest"],
  fullstack: ["full stack", "full-stack", "frontend", "backend", "web"],
  mobile: ["ios", "android", "react native", "flutter", "swift", "kotlin"],
  cloud: ["aws", "azure", "gcp", "devops", "infrastructure", "terraform"],
  ml: ["machine learning", "ai", "artificial intelligence", "deep learning", "nlp", "computer vision"],
  python: ["django", "flask", "data", "machine learning", "backend"],
  java: ["spring", "backend", "enterprise", "microservices"],
  react: ["frontend", "javascript", "typescript", "next.js", "redux"],
};

/**
 * Dynamically expands a search query into related terms.
 * Works for ANY keyword — not limited to predefined lists.
 */
export function expandSearchTerms(query: string): string[] {
  if (!query || !query.trim()) return [];

  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/[\s,/\-_]+/).filter(w => w.length > 1);
  const expanded = new Set<string>();

  for (const word of words) {
    // 1. Check role families (both as key and in values)
    for (const [family, related] of Object.entries(ROLE_FAMILIES)) {
      const familyMatch = word === family || family.includes(word) || word.includes(family);
      const valueMatch = related.some(r => r.includes(word) || word.includes(r));

      if (familyMatch) {
        related.forEach(r => expanded.add(r));
        expanded.add(family);
      }
      if (valueMatch) {
        expanded.add(family);
        related.forEach(r => expanded.add(r));
      }
    }

    // 2. Check keyword associations
    for (const [key, related] of Object.entries(KEYWORD_ASSOCIATIONS)) {
      if (word === key || key.includes(word) || word.includes(key)) {
        related.forEach(r => expanded.add(r));
      }
      if (related.some(r => r.includes(word) || word.includes(r))) {
        expanded.add(key);
        related.forEach(r => expanded.add(r));
      }
    }

    // 3. Removed prefix/suffix generation — too broad for ILIKE matching
  }

  // Remove the original query terms and very short terms
  for (const word of words) {
    expanded.delete(word);
  }

  // Filter out terms that are too short or identical to input
  const result = [...expanded].filter(t =>
    t.length > 1 &&
    t !== normalized &&
    !words.includes(t)
  );

  // Limit to top 20 most relevant terms to avoid query bloat
  return result.slice(0, 20);
}
