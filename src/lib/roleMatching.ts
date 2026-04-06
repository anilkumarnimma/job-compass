/**
 * Role domain detection and adjacency logic.
 * Extracted for reuse across recommendations, dashboard, and tailored resume.
 */

// Ordered regex patterns — first match wins
const ROLE_DOMAIN_PATTERNS: { domain: string; patterns: RegExp[] }[] = [
  {
    domain: "data-science",
    patterns: [
      /\b(data\s*scientist|machine\s*learning|ml\s*engineer|ai\s*engineer|deep\s*learning|nlp|computer\s*vision)\b/i,
    ],
  },
  {
    domain: "data-analytics",
    patterns: [
      /\b(data\s*analyst|bi\s*analyst|business\s*intelligence|analytics\s*engineer|reporting\s*analyst)\b/i,
    ],
  },
  {
    domain: "data-engineering",
    patterns: [
      /\b(data\s*engineer|etl|data\s*platform|data\s*infrastructure)\b/i,
    ],
  },
  {
    domain: "software-engineering",
    patterns: [
      /\b(software\s*(engineer|developer)|full[\s-]?stack|front[\s-]?end|back[\s-]?end|web\s*developer|sde\b|swe\b|java\s*developer|python\s*developer|react\s*developer|node\s*developer|\.net\s*developer|golang|rust\s*developer|c\+\+\s*developer)\b/i,
      /\b(application\s*developer|systems?\s*developer|api\s*developer|cloud\s*developer)\b/i,
    ],
  },
  {
    domain: "mobile",
    patterns: [
      /\b(mobile\s*(developer|engineer)|ios\s*(developer|engineer)|android\s*(developer|engineer)|react\s*native|flutter\s*(developer|engineer)|swift\s*developer|kotlin\s*developer)\b/i,
    ],
  },
  {
    domain: "devops",
    patterns: [
      /\b(devops|sre|site\s*reliability|platform\s*engineer|infrastructure\s*engineer|cloud\s*engineer|aws\s*engineer|azure\s*engineer|gcp\s*engineer|kubernetes\s*engineer)\b/i,
    ],
  },
  {
    domain: "qa",
    patterns: [
      /\b(qa\s*(engineer|analyst|lead)|quality\s*assurance|test\s*(engineer|automation|lead)|sdet|automation\s*engineer)\b/i,
    ],
  },
  {
    domain: "security",
    patterns: [
      /\b(security\s*(engineer|analyst|architect)|cyber\s*security|infosec|penetration\s*test|appsec)\b/i,
    ],
  },
  {
    domain: "design",
    patterns: [
      /\b(ux|ui|product\s*design|interaction\s*design|visual\s*design|graphic\s*design)\b/i,
    ],
  },
  {
    domain: "product",
    patterns: [
      /\b(product\s*manager|product\s*owner|program\s*manager|technical\s*program\s*manager|scrum\s*master)\b/i,
    ],
  },
  {
    domain: "marketing",
    patterns: [
      /\b(marketing|growth\s*(manager|lead|hacker)|seo|content\s*(manager|strategist)|brand\s*manager|social\s*media|digital\s*marketing)\b/i,
    ],
  },
  {
    domain: "sales",
    patterns: [
      /\b(sales|account\s*executive|business\s*development|bdr|sdr|revenue)\b/i,
    ],
  },
  {
    domain: "support",
    patterns: [
      /\b(customer\s*(success|support|experience|service)|cx\s*(manager|lead)|help\s*desk|technical\s*support)\b/i,
    ],
  },
  {
    domain: "hr",
    patterns: [
      /\b(human\s*resources|recruiter|talent\s*(acquisition|partner)|people\s*ops|hr\s*(manager|generalist|business\s*partner))\b/i,
    ],
  },
  {
    domain: "finance",
    patterns: [
      /\b(finance|accounting|financial\s*analyst|controller|cfo|treasury|audit)\b/i,
    ],
  },
  {
    domain: "operations",
    patterns: [
      /\b(operations\s*(manager|analyst|lead)|supply\s*chain|logistics|procurement)\b/i,
    ],
  },
  {
    domain: "management-consulting",
    patterns: [
      /\b(management\s*consult|strategy\s*consult|business\s*consult|associate\s*consult)\b/i,
    ],
  },
  {
    domain: "project-management",
    patterns: [
      /\b(project\s*(manager|coordinator|lead)|pmp)\b/i,
    ],
  },
];

const DOMAIN_ADJACENCY: Record<string, string[]> = {
  "software-engineering": ["mobile", "devops", "qa", "data-engineering"],
  "mobile": ["software-engineering"],
  "devops": ["software-engineering", "security"],
  "qa": ["software-engineering"],
  "data-science": ["data-analytics", "data-engineering"],
  "data-analytics": ["data-science", "data-engineering"],
  "data-engineering": ["data-science", "data-analytics", "software-engineering"],
  "security": ["devops", "software-engineering"],
  "design": [],
  "product": ["project-management"],
  "project-management": ["product"],
  "marketing": [],
  "sales": [],
  "support": [],
  "hr": [],
  "finance": [],
  "operations": [],
  "management-consulting": [],
};

export function detectDomain(title: string): string | null {
  for (const { domain, patterns } of ROLE_DOMAIN_PATTERNS) {
    if (patterns.some((p) => p.test(title))) return domain;
  }
  return null;
}

export function isRoleRelevant(
  jobTitle: string,
  userRole: string,
  targetTitles: string[]
): boolean {
  const jobDomain = detectDomain(jobTitle);
  const userDomain = detectDomain(userRole);

  // If we can't classify the job, allow it (let score-based filtering decide)
  if (!jobDomain) return true;

  if (!userDomain) {
    for (const tt of targetTitles) {
      const ttDomain = detectDomain(tt);
      if (ttDomain === jobDomain) return true;
      if (ttDomain && DOMAIN_ADJACENCY[ttDomain]?.includes(jobDomain)) return true;
    }
    return targetTitles.length === 0;
  }

  if (jobDomain === userDomain) return true;
  if (DOMAIN_ADJACENCY[userDomain]?.includes(jobDomain)) return true;

  for (const tt of targetTitles) {
    const ttDomain = detectDomain(tt);
    if (ttDomain === jobDomain) return true;
    if (ttDomain && DOMAIN_ADJACENCY[ttDomain]?.includes(jobDomain)) return true;
  }

  return false;
}
