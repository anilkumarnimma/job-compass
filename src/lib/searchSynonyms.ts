/**
 * Semantic role synonym map for intelligent job search.
 * Groups related job titles so searching for one surfaces the others.
 * Exact matches are still prioritized via FTS rank.
 */

const ROLE_GROUPS: string[][] = [
  // Data & Analytics
  ["data analyst", "data engineer", "data scientist", "business intelligence analyst", "bi analyst", "analytics engineer", "reporting analyst", "machine learning analyst", "data specialist", "business analyst", "data architect", "etl developer", "data analytics"],
  
  // Software Engineering
  ["software engineer", "software developer", "backend engineer", "backend developer", "full stack engineer", "full stack developer", "frontend engineer", "frontend developer", "platform engineer", "application developer", "web developer", "sde", "systems engineer"],
  
  // DevOps & Infrastructure
  ["devops engineer", "site reliability engineer", "sre", "infrastructure engineer", "cloud engineer", "platform engineer", "systems administrator", "release engineer", "build engineer"],
  
  // Machine Learning & AI
  ["machine learning engineer", "ml engineer", "ai engineer", "deep learning engineer", "nlp engineer", "computer vision engineer", "data scientist", "research scientist", "applied scientist"],
  
  // Product & Design
  ["product manager", "product owner", "program manager", "technical program manager", "project manager", "scrum master", "agile coach"],
  ["ux designer", "ui designer", "product designer", "interaction designer", "visual designer", "ui/ux designer", "ux researcher", "design lead"],
  
  // QA & Testing
  ["qa engineer", "quality assurance engineer", "test engineer", "sdet", "automation engineer", "quality engineer", "test analyst"],
  
  // Security
  ["security engineer", "cybersecurity engineer", "information security analyst", "security analyst", "penetration tester", "security architect", "devsecops engineer"],
  
  // Mobile
  ["mobile developer", "ios developer", "android developer", "react native developer", "flutter developer", "mobile engineer", "ios engineer", "android engineer"],
  
  // Marketing
  ["marketing manager", "digital marketing manager", "growth marketer", "content marketer", "seo specialist", "marketing analyst", "brand manager", "performance marketer"],
  
  // Sales
  ["sales representative", "account executive", "business development representative", "bdr", "sdr", "sales engineer", "account manager", "sales manager"],
  
  // HR & Recruiting
  ["recruiter", "talent acquisition specialist", "hr manager", "human resources manager", "people operations", "hr business partner", "talent partner", "sourcer"],
  
  // Finance & Accounting
  ["financial analyst", "accountant", "finance manager", "controller", "fp&a analyst", "bookkeeper", "auditor", "tax analyst"],
  
  // Customer Support
  ["customer support", "customer success manager", "support engineer", "technical support", "help desk", "customer service representative", "client success"],

  // Cloud & Architecture
  ["cloud architect", "solutions architect", "enterprise architect", "technical architect", "aws architect", "azure architect", "cloud consultant"],

  // Networking
  ["network engineer", "network administrator", "network architect", "telecommunications engineer", "wireless engineer"],

  // Database
  ["database administrator", "dba", "database engineer", "database developer", "sql developer"],
];

// Build a lookup: normalized title → set of related terms
const synonymMap = new Map<string, Set<string>>();

for (const group of ROLE_GROUPS) {
  const normalized = group.map(t => t.toLowerCase().trim());
  for (const term of normalized) {
    if (!synonymMap.has(term)) {
      synonymMap.set(term, new Set());
    }
    for (const related of normalized) {
      if (related !== term) {
        synonymMap.get(term)!.add(related);
      }
    }
  }
}

/**
 * Given a user's search query, return an array of expanded search terms
 * that include semantically related roles. The original query is always first.
 */
export function expandSearchQuery(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results = new Set<string>([query.trim()]); // original first

  // Direct match in synonym map
  const directMatch = synonymMap.get(q);
  if (directMatch) {
    for (const related of directMatch) {
      results.add(related);
    }
    return [...results];
  }

  // Partial match: check if query is a substring of any key or vice versa
  for (const [key, related] of synonymMap.entries()) {
    if (key.includes(q) || q.includes(key)) {
      results.add(key);
      for (const r of related) {
        results.add(r);
      }
    }
  }

  // If we found expanded terms, return them
  if (results.size > 1) {
    return [...results];
  }

  // No synonyms found — return original query only
  return [query.trim()];
}
