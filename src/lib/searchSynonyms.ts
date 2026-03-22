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

/**
 * Keyword-level synonym map for single-word or short keyword searches.
 * Maps common keywords to related job title fragments.
 */
const KEYWORD_EXPANSIONS: Record<string, string[]> = {
  "data": ["data analyst", "data engineer", "data scientist", "analytics engineer", "bi analyst", "business intelligence", "reporting analyst", "data architect", "etl developer"],
  "java": ["java developer", "backend engineer", "software engineer", "full stack engineer", "application developer", "backend developer"],
  "python": ["python developer", "data scientist", "data engineer", "machine learning engineer", "backend engineer", "software engineer", "automation engineer"],
  "ai": ["ai engineer", "machine learning engineer", "ml engineer", "data scientist", "deep learning engineer", "nlp engineer", "computer vision engineer", "research scientist"],
  "ml": ["machine learning engineer", "ml engineer", "ai engineer", "data scientist", "deep learning engineer", "applied scientist"],
  "cloud": ["cloud engineer", "cloud architect", "aws architect", "azure architect", "devops engineer", "infrastructure engineer", "solutions architect"],
  "frontend": ["frontend developer", "frontend engineer", "ui developer", "web developer", "react developer", "full stack developer"],
  "backend": ["backend developer", "backend engineer", "software engineer", "full stack engineer", "api developer", "systems engineer"],
  "react": ["react developer", "frontend developer", "frontend engineer", "full stack developer", "web developer", "ui engineer"],
  "node": ["node developer", "backend developer", "full stack developer", "software engineer", "javascript developer"],
  "design": ["ux designer", "ui designer", "product designer", "visual designer", "interaction designer", "graphic designer", "design lead"],
  "devops": ["devops engineer", "sre", "site reliability engineer", "infrastructure engineer", "platform engineer", "cloud engineer"],
  "security": ["security engineer", "cybersecurity engineer", "security analyst", "penetration tester", "security architect", "devsecops engineer", "information security"],
  "mobile": ["mobile developer", "ios developer", "android developer", "react native developer", "flutter developer", "mobile engineer"],
  "product": ["product manager", "product owner", "product designer", "program manager", "product analyst"],
  "marketing": ["marketing manager", "digital marketing", "growth marketer", "content marketer", "seo specialist", "brand manager", "performance marketer"],
  "sales": ["sales representative", "account executive", "business development", "sales engineer", "account manager", "sales manager"],
  "hr": ["hr manager", "recruiter", "talent acquisition", "human resources", "people operations", "hr business partner"],
  "finance": ["financial analyst", "finance manager", "accountant", "controller", "fp&a analyst", "auditor"],
  "support": ["customer support", "customer success", "support engineer", "technical support", "help desk", "customer service"],
  "qa": ["qa engineer", "quality assurance", "test engineer", "sdet", "automation engineer", "quality engineer"],
  "network": ["network engineer", "network administrator", "network architect", "telecommunications engineer", "systems administrator"],
  "database": ["database administrator", "dba", "database engineer", "sql developer", "data engineer"],
  "sql": ["sql developer", "database administrator", "data analyst", "data engineer", "bi analyst", "reporting analyst"],
  "aws": ["aws architect", "cloud engineer", "devops engineer", "solutions architect", "infrastructure engineer"],
  "azure": ["azure architect", "cloud engineer", "devops engineer", "solutions architect", "infrastructure engineer"],
  "manager": ["product manager", "project manager", "engineering manager", "marketing manager", "sales manager", "account manager", "hr manager"],
  "engineer": ["software engineer", "data engineer", "devops engineer", "backend engineer", "frontend engineer", "cloud engineer", "qa engineer", "security engineer", "ml engineer"],
  "developer": ["software developer", "web developer", "frontend developer", "backend developer", "full stack developer", "mobile developer", "application developer"],
  "analyst": ["data analyst", "business analyst", "financial analyst", "security analyst", "bi analyst", "marketing analyst", "reporting analyst"],
  "architect": ["solutions architect", "cloud architect", "enterprise architect", "security architect", "technical architect", "data architect"],
  "consultant": ["cloud consultant", "it consultant", "management consultant", "strategy consultant", "technology consultant"],
  "intern": ["software engineer intern", "data analyst intern", "marketing intern", "product management intern", "design intern", "engineering intern"],
  "junior": ["junior developer", "junior engineer", "junior analyst", "junior designer", "entry level"],
  "senior": ["senior engineer", "senior developer", "senior analyst", "senior designer", "senior manager", "lead engineer"],
  "lead": ["tech lead", "team lead", "engineering lead", "design lead", "product lead"],
  "remote": ["remote engineer", "remote developer", "work from home"],
  "fullstack": ["full stack developer", "full stack engineer", "software engineer", "web developer"],
  "javascript": ["javascript developer", "frontend developer", "full stack developer", "react developer", "node developer", "web developer"],
  "typescript": ["typescript developer", "frontend developer", "full stack developer", "software engineer", "react developer"],
  "go": ["golang developer", "backend engineer", "software engineer", "systems engineer", "platform engineer"],
  "golang": ["golang developer", "backend engineer", "software engineer", "systems engineer", "platform engineer"],
  "rust": ["rust developer", "systems engineer", "backend engineer", "software engineer", "platform engineer"],
  "c++": ["c++ developer", "systems engineer", "software engineer", "embedded engineer", "game developer"],
  "kubernetes": ["devops engineer", "platform engineer", "cloud engineer", "sre", "infrastructure engineer"],
  "docker": ["devops engineer", "platform engineer", "cloud engineer", "backend engineer", "infrastructure engineer"],
};

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

  // 1. Direct match in synonym map (exact role title match)
  const directMatch = synonymMap.get(q);
  if (directMatch) {
    for (const related of directMatch) {
      results.add(related);
    }
  }

  // 2. Keyword-level expansion (single words or short queries)
  const keywordMatch = KEYWORD_EXPANSIONS[q];
  if (keywordMatch) {
    for (const related of keywordMatch) {
      results.add(related);
    }
  }

  // 3. Partial match: check if query is a substring of any key or vice versa
  for (const [key, related] of synonymMap.entries()) {
    if (key.includes(q) || q.includes(key)) {
      results.add(key);
      for (const r of related) {
        results.add(r);
      }
    }
  }

  // 4. Check keyword expansions for partial matches too
  for (const [keyword, expansions] of Object.entries(KEYWORD_EXPANSIONS)) {
    if (keyword.includes(q) || q.includes(keyword)) {
      for (const exp of expansions) {
        results.add(exp);
      }
    }
  }

  // 5. Split multi-word queries and expand individual words
  const words = q.split(/\s+/).filter(w => w.length >= 2);
  if (words.length > 1) {
    for (const word of words) {
      const wordExpansion = KEYWORD_EXPANSIONS[word];
      if (wordExpansion) {
        for (const exp of wordExpansion) {
          results.add(exp);
        }
      }
    }
  }

  return results.size > 1 ? [...results] : [query.trim()];
}
