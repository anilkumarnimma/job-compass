import { Job } from "@/types/job";

// Skill extraction dictionary
const COMMON_SKILLS: Record<string, string> = {
  'js': 'JavaScript', 'javascript': 'JavaScript', 'typescript': 'TypeScript', 'ts': 'TypeScript',
  'react': 'React', 'reactjs': 'React', 'react.js': 'React',
  'angular': 'Angular', 'vue': 'Vue.js', 'vuejs': 'Vue.js',
  'node': 'Node.js', 'nodejs': 'Node.js', 'node.js': 'Node.js',
  'python': 'Python', 'java': 'Java', 'c#': 'C#', 'csharp': 'C#', 'c++': 'C++', 'cpp': 'C++',
  'go': 'Go', 'golang': 'Go', 'rust': 'Rust', 'ruby': 'Ruby', 'php': 'PHP', 'swift': 'Swift',
  'kotlin': 'Kotlin', 'scala': 'Scala', 'r': 'R', 'perl': 'Perl',
  'html': 'HTML', 'html5': 'HTML', 'css': 'CSS', 'css3': 'CSS', 'sass': 'Sass', 'scss': 'Sass',
  'sql': 'SQL', 'mysql': 'MySQL', 'postgresql': 'PostgreSQL', 'postgres': 'PostgreSQL',
  'mongodb': 'MongoDB', 'mongo': 'MongoDB', 'redis': 'Redis', 'elasticsearch': 'Elasticsearch',
  'dynamodb': 'DynamoDB', 'cassandra': 'Cassandra', 'oracle': 'Oracle',
  'aws': 'AWS', 'azure': 'Azure', 'gcp': 'GCP', 'google cloud': 'GCP',
  'docker': 'Docker', 'kubernetes': 'Kubernetes', 'k8s': 'Kubernetes',
  'terraform': 'Terraform', 'ansible': 'Ansible', 'jenkins': 'Jenkins',
  'git': 'Git', 'github': 'GitHub', 'gitlab': 'GitLab', 'ci/cd': 'CI/CD', 'cicd': 'CI/CD',
  'rest': 'REST APIs', 'restful': 'REST APIs', 'graphql': 'GraphQL', 'grpc': 'gRPC',
  'kafka': 'Kafka', 'rabbitmq': 'RabbitMQ',
  'linux': 'Linux', 'unix': 'Unix', 'bash': 'Bash',
  'agile': 'Agile', 'scrum': 'Scrum', 'jira': 'Jira',
  'figma': 'Figma', 'sketch': 'Sketch',
  'machine learning': 'Machine Learning', 'ml': 'Machine Learning',
  'deep learning': 'Deep Learning', 'nlp': 'NLP', 'ai': 'AI',
  'tensorflow': 'TensorFlow', 'pytorch': 'PyTorch', 'pandas': 'Pandas', 'numpy': 'NumPy',
  'spark': 'Apache Spark', 'hadoop': 'Hadoop',
  'tableau': 'Tableau', 'power bi': 'Power BI', 'powerbi': 'Power BI',
  'salesforce': 'Salesforce', 'sap': 'SAP',
  'next.js': 'Next.js', 'nextjs': 'Next.js', 'nuxt': 'Nuxt.js',
  'express': 'Express.js', 'fastapi': 'FastAPI',
  'django': 'Django', 'flask': 'Flask', 'spring': 'Spring', 'spring boot': 'Spring Boot',
  '.net': '.NET', 'dotnet': '.NET', 'asp.net': 'ASP.NET',
  'redux': 'Redux', 'tailwind': 'Tailwind CSS', 'tailwindcss': 'Tailwind CSS',
  'bootstrap': 'Bootstrap', 'material ui': 'Material UI', 'mui': 'Material UI',
  'webpack': 'Webpack', 'vite': 'Vite',
  'jest': 'Jest', 'cypress': 'Cypress', 'selenium': 'Selenium', 'playwright': 'Playwright',
  'firebase': 'Firebase', 'supabase': 'Supabase',
  'snowflake': 'Snowflake', 'databricks': 'Databricks', 'airflow': 'Airflow',
  'microservices': 'Microservices', 'serverless': 'Serverless',
  'oauth': 'OAuth', 'jwt': 'JWT', 'sso': 'SSO',
  'excel': 'Excel', 'sharepoint': 'SharePoint',
  'data engineering': 'Data Engineering', 'etl': 'ETL',
  'data warehouse': 'Data Warehouse', 'data pipeline': 'Data Pipeline',
  'devops': 'DevOps', 'sre': 'SRE',
  'project management': 'Project Management', 'product management': 'Product Management',
  'communication': 'Communication', 'leadership': 'Leadership',
  'problem solving': 'Problem Solving', 'analytical': 'Analytical Skills',
};

const SKILL_PATTERNS = Object.keys(COMMON_SKILLS).sort((a, b) => b.length - a.length);

function extractSkillsFromDescription(description: string): string[] {
  if (!description) return [];
  const text = description.toLowerCase();
  const foundSkills = new Set<string>();
  for (const pattern of SKILL_PATTERNS) {
    const regex = new RegExp(`(?:^|[\\s,;/|()•\\-])${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[\\s,;/|()•\\-])`, 'i');
    if (regex.test(text)) {
      foundSkills.add(COMMON_SKILLS[pattern]);
    }
  }
  return Array.from(foundSkills);
}

/** Enrich job skills to at least 6-7 by extracting from description */
export function enrichJobSkills(job: Job): string[] {
  if (job.skills.length >= 6) return job.skills;
  const existing = new Set(job.skills.map(s => s.toLowerCase()));
  const extracted = extractSkillsFromDescription(job.description);
  const merged = [...job.skills];
  for (const skill of extracted) {
    if (!existing.has(skill.toLowerCase())) {
      merged.push(skill);
      existing.add(skill.toLowerCase());
    }
    if (merged.length >= 7) break;
  }
  return merged;
}

/** Extract salary from description if not already set */
export function extractSalary(job: Job): string | null {
  if (job.salary_range) return job.salary_range;
  if (!job.description) return null;
  const patterns = [
    /\$[\d,]+(?:\.\d+)?[kK]?\s*[-–to]+\s*\$[\d,]+(?:\.\d+)?[kK]?\s*(?:per\s+(?:year|annum|hour|hr)|\/(?:yr|hr|hour|year)|annually|hourly)?/gi,
    /\$[\d,]+(?:\.\d+)?[kK]?\s*(?:per\s+(?:year|annum|hour|hr)|\/(?:yr|hr|hour|year)|annually|hourly)/gi,
    /(?:salary|pay|compensation|base|annual|hourly)\s*(?:range|rate)?[\s:]*\$[\d,]+(?:\.\d+)?[kK]?\s*[-–to]*\s*\$?[\d,]*(?:\.\d+)?[kK]?/gi,
    /\$[\d,]+(?:\.\d+)?[kK]?\s*[-–]\s*\$[\d,]+(?:\.\d+)?[kK]?/gi,
  ];
  for (const p of patterns) {
    const m = job.description.match(p);
    if (m) return m[0].trim().replace(/\s+/g, ' ');
  }
  return null;
}

/** Get source priority score (lower = better) */
function getSourcePriority(link: string): number {
  const l = (link || '').toLowerCase();
  if (l.includes('greenhouse.io') || l.includes('greenhouse.com')) return 0;
  if (l.includes('lever.co')) return 1;
  if (l.includes('workday') || l.includes('icims') || l.includes('taleo') || l.includes('smartrecruiters') || l.includes('jobvite')) return 2;
  if (l.includes('dice.com') || l.includes('lensa.com') || l.includes('lensa.')) return 9;
  return 3;
}

/** Sort jobs by source quality */
function sortBySourceQuality(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const pa = getSourcePriority(a.external_apply_link);
    const pb = getSourcePriority(b.external_apply_link);
    if (pa !== pb) return pa - pb;
    return (b.posted_date?.getTime() || 0) - (a.posted_date?.getTime() || 0);
  });
}

/** Spread similar jobs so near-duplicates don't appear back-to-back */
export function spreadSimilarJobs(jobs: Job[]): Job[] {
  if (jobs.length <= 2) return jobs;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  function areSimilar(a: Job, b: Job): boolean {
    const tA = normalize(a.title), tB = normalize(b.title);
    const cA = normalize(a.company), cB = normalize(b.company);
    // Same company + very similar title
    if (cA === cB && (tA === tB || tA.includes(tB) || tB.includes(tA))) return true;
    // Same title from different source but same-ish company name
    if (tA === tB && (cA.includes(cB) || cB.includes(cA))) return true;
    return false;
  }

  const result: Job[] = [jobs[0]];
  const remaining = jobs.slice(1);
  const deferred: Job[] = [];

  for (const job of remaining) {
    const last = result[result.length - 1];
    if (areSimilar(job, last)) {
      deferred.push(job);
    } else {
      result.push(job);
      // Try to insert a deferred job if it's no longer similar to current tail
      if (deferred.length > 0) {
        const idx = deferred.findIndex(d => !areSimilar(d, job));
        if (idx !== -1) {
          result.push(deferred.splice(idx, 1)[0]);
        }
      }
    }
  }

  // Append remaining deferred, spacing them out
  for (const d of deferred) {
    result.push(d);
  }

  return result;
}

/** Enrich a list of jobs: skills, salary, source ranking, and ordering */
export function enrichJobList(jobs: Job[]): Job[] {
  const enriched = jobs.map(job => ({
    ...job,
    skills: enrichJobSkills(job),
    salary_range: extractSalary(job),
  }));
  const sorted = sortBySourceQuality(enriched);
  return spreadSimilarJobs(sorted);
}
