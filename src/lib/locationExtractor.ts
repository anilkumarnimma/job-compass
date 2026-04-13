/**
 * Extracts location from job description when the stored location is suspicious.
 * Uses regex patterns to find city/state combos, "Remote" markers, etc.
 */

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

const STATE_ABBREVS = new Set(Object.keys(US_STATES));

// Known major cities for quick matching
const MAJOR_CITIES = [
  'New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Seattle',
  'Denver', 'Nashville', 'Las Vegas', 'Portland', 'Atlanta', 'Boston',
  'Detroit', 'Miami', 'Minneapolis', 'Tampa', 'Orlando', 'Raleigh',
  'Pittsburgh', 'Cincinnati', 'St. Louis', 'Baltimore', 'Milwaukee',
  'Sacramento', 'Charlotte', 'Indianapolis', 'Columbus', 'Kansas City',
  'Salt Lake City', 'San Antonio', 'Arlington', 'Irvine', 'Plano',
  'Redmond', 'Cupertino', 'Mountain View', 'Palo Alto', 'Sunnyvale',
  'Washington', 'McLean', 'Tysons', 'Herndon', 'Reston', 'Richmond',
];

/**
 * Detect if a stored location looks suspicious and should be replaced.
 * - Too short (1-3 chars like "IN", "US", "NY")
 * - Just a state abbreviation with no city
 * - Generic placeholders
 */
export function isSuspiciousLocation(location: string | null | undefined): boolean {
  if (!location) return true;
  const trimmed = location.trim();
  if (trimmed.length === 0) return true;
  if (/^nan$/i.test(trimmed)) return true;
  if (/^not specified$/i.test(trimmed)) return true;

  // Just a 2-letter code (state abbrev or country code)
  if (/^[A-Z]{2}$/i.test(trimmed)) return true;

  // Just a 2-3 letter code
  if (trimmed.length <= 3 && /^[a-zA-Z]+$/.test(trimmed)) return true;

  return false;
}

/**
 * Extract location from job description text using regex patterns.
 * Returns the best match or null if nothing found.
 */
export function extractLocationFromDescription(description: string): string | null {
  if (!description || description.length < 20) return null;

  // Take first ~3000 chars (location is usually near the top)
  const text = description.slice(0, 3000);

  // Pattern 1: "City, ST" format (e.g., "Washington, DC" or "San Francisco, CA")
  const cityStatePattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2})\b/g;
  let match;
  while ((match = cityStatePattern.exec(text)) !== null) {
    const [, city, state] = match;
    if (STATE_ABBREVS.has(state) && city.length > 1) {
      return `${city}, ${state}`;
    }
  }

  // Pattern 2: "Location: City, State" or "Location: Remote"
  const locationLabelPattern = /(?:location|based in|office in|headquartered in|located in|work location)[:\s]+([A-Z][a-zA-Z\s,]+(?:[A-Z]{2}))/i;
  const labelMatch = text.match(locationLabelPattern);
  if (labelMatch) {
    const loc = labelMatch[1].trim().replace(/[.;]$/, '');
    if (loc.length >= 4 && loc.length <= 60) return loc;
  }

  // Pattern 3: Known major city names
  for (const city of MAJOR_CITIES) {
    const cityRegex = new RegExp(`\\b${city}\\b`, 'i');
    if (cityRegex.test(text)) {
      // Try to find the state after the city
      const afterCity = new RegExp(`\\b${city},?\\s*([A-Z]{2})\\b`, 'i');
      const afterMatch = text.match(afterCity);
      if (afterMatch && STATE_ABBREVS.has(afterMatch[1].toUpperCase())) {
        return `${city}, ${afterMatch[1].toUpperCase()}`;
      }
      return city;
    }
  }

  // Pattern 4: Remote indicators
  const remotePattern = /\b(remote|work from home|wfh|telecommute|fully remote|hybrid remote)\b/i;
  const remoteMatch = text.match(remotePattern);
  if (remoteMatch) {
    // Check if it specifies a country/region with remote
    const remoteUsPattern = /\bremote\s*[-–—]?\s*(?:US|USA|United States)\b/i;
    if (remoteUsPattern.test(text)) return 'Remote - US';
    return 'Remote';
  }

  return null;
}

/**
 * Get the best location for a job: use stored location if valid,
 * otherwise try to extract from description.
 */
export function getBestLocation(storedLocation: string, description: string): string {
  if (!isSuspiciousLocation(storedLocation)) {
    return storedLocation;
  }

  const extracted = extractLocationFromDescription(description);
  if (extracted) return extracted;

  // Fallback to stored location if we have nothing better
  return storedLocation || 'Location not specified';
}
