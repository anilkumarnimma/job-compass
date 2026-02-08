import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetRow {
  posted_date: string;
  title: string;
  company: string;
  location: string;
  description_short: string;
  description_full: string;
  apply_link: string;
  job_type?: string;
  experience_years?: string;
  salary?: string;
  skills?: string;
  actively_reviewing?: string;
  company_logo_url?: string;
  is_published?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'true' || lower === 'yes' || lower === '1';
}

function parseSkills(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try MM/DD/YYYY format
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const [m, d, y] = parts.map(Number);
    const parsed = new Date(y, m - 1, d);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  return null;
}

function extractSheetId(url: string): string | null {
  // Handle various Google Sheets URL formats
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /^([a-zA-Z0-9-_]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchSheetData(sheetUrl: string): Promise<{ headers: string[]; rows: string[][] }> {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    throw new Error('Invalid Google Sheets URL. Please use a public sheet URL.');
  }
  
  // Use Google Sheets CSV export endpoint (works for public sheets)
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  
  console.log(`Fetching sheet: ${sheetId}`);
  
  const response = await fetch(csvUrl);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Sheet not found. Make sure the sheet is publicly accessible (Anyone with link can view).');
    }
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }
  
  const csvText = await response.text();
  const lines = parseCSV(csvText);
  
  if (lines.length < 2) {
    throw new Error('Sheet must have at least a header row and one data row.');
  }
  
  const headers = lines[0].map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
  const rows = lines.slice(1);
  
  return { headers, rows };
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++; // Skip \n in \r\n
      } else if (char !== '\r') {
        currentCell += char;
      }
    }
  }
  
  // Handle last cell/row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell !== '')) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

function rowToObject(headers: string[], row: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] || '';
  });
  return obj;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to check admin status
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify user is admin
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check admin role
    const { data: isAdminData } = await supabaseAuth.rpc('is_admin');
    if (!isAdminData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { sheet_url, action } = body;

    if (!sheet_url) {
      return new Response(
        JSON.stringify({ error: 'sheet_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test connection - just validate we can fetch the sheet
    if (action === 'test') {
      console.log('Testing connection to sheet...');
      const { headers, rows } = await fetchSheetData(sheet_url);
      
      const requiredColumns = ['posted_date', 'title', 'company', 'location', 'description_short', 'description_full', 'apply_link'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Missing required columns: ${missingColumns.join(', ')}`,
            found_columns: headers
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Connection successful!',
          row_count: rows.length,
          columns: headers
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Import action
    if (action === 'import') {
      console.log('Starting import...');
      
      // Use service role for import operations
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      const { headers, rows } = await fetchSheetData(sheet_url);
      
      // Validate required columns
      const requiredColumns = ['posted_date', 'title', 'company', 'location', 'description_short', 'description_full', 'apply_link'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        return new Response(
          JSON.stringify({ error: `Missing required columns: ${missingColumns.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Limit to 500 rows per import
      const limitedRows = rows.slice(0, 500);
      
      // Get existing apply_links for duplicate detection
      const { data: existingJobs } = await supabaseAdmin
        .from('jobs')
        .select('external_apply_link, title, company, posted_date');
      
      const existingLinks = new Set(existingJobs?.map(j => j.external_apply_link) || []);
      const existingJobKeys = new Set(
        existingJobs?.map(j => `${j.title}|${j.company}|${j.posted_date}`) || []
      );

      const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
      const jobsToInsert: any[] = [];

      for (let i = 0; i < limitedRows.length; i++) {
        const rowNum = i + 2; // Account for header row and 0-indexing
        const row = rowToObject(headers, limitedRows[i]);
        
        try {
          // Validate required fields
          if (!row.title?.trim()) {
            result.errors.push({ row: rowNum, message: 'Missing title' });
            continue;
          }
          if (!row.company?.trim()) {
            result.errors.push({ row: rowNum, message: 'Missing company' });
            continue;
          }
          if (!row.apply_link?.trim()) {
            result.errors.push({ row: rowNum, message: 'Missing apply_link' });
            continue;
          }
          if (!isValidUrl(row.apply_link)) {
            result.errors.push({ row: rowNum, message: 'Invalid apply_link URL' });
            continue;
          }
          if (!row.posted_date?.trim()) {
            result.errors.push({ row: rowNum, message: 'Missing posted_date' });
            continue;
          }
          
          const postedDate = parseDate(row.posted_date);
          if (!postedDate) {
            result.errors.push({ row: rowNum, message: 'Invalid posted_date format' });
            continue;
          }

          // Check for duplicates
          if (existingLinks.has(row.apply_link)) {
            result.skipped++;
            continue;
          }
          
          const jobKey = `${row.title}|${row.company}|${postedDate.toISOString()}`;
          if (existingJobKeys.has(jobKey)) {
            result.skipped++;
            continue;
          }

          // Map employment type
          let employmentType = 'Full Time';
          if (row.job_type) {
            const jt = row.job_type.toLowerCase();
            if (jt.includes('contract')) employmentType = 'Contract';
            else if (jt.includes('intern')) employmentType = 'Internship';
            else if (jt.includes('part')) employmentType = 'Part Time';
          }

          // Build description
          const description = row.description_full || row.description_short || '';

          jobsToInsert.push({
            title: row.title.trim(),
            company: row.company.trim(),
            location: row.location?.trim() || 'Remote',
            description: description.trim(),
            external_apply_link: row.apply_link.trim(),
            posted_date: postedDate.toISOString(),
            employment_type: employmentType,
            experience_years: row.experience_years?.trim() || null,
            salary_range: row.salary?.trim() || null,
            skills: parseSkills(row.skills),
            is_reviewing: parseBoolean(row.actively_reviewing),
            company_logo: row.company_logo_url?.trim() || null,
            is_published: row.is_published !== undefined ? parseBoolean(row.is_published) : true,
          });
          
          // Mark as existing to prevent duplicates within same batch
          existingLinks.add(row.apply_link);
          existingJobKeys.add(jobKey);
          
        } catch (err) {
          console.error(`Error processing row ${rowNum}:`, err);
          result.errors.push({ row: rowNum, message: String(err) });
        }
      }

      // Batch insert all valid jobs
      if (jobsToInsert.length > 0) {
        console.log(`Inserting ${jobsToInsert.length} jobs...`);
        const { error: insertError } = await supabaseAdmin
          .from('jobs')
          .insert(jobsToInsert);
        
        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response(
            JSON.stringify({ error: `Failed to insert jobs: ${insertError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result.imported = jobsToInsert.length;
      }

      // Save import history
      const { error: historyError } = await supabaseAdmin
        .from('import_history')
        .insert({
          user_id: user.id,
          sheet_url: sheet_url,
          imported_count: result.imported,
          skipped_count: result.skipped,
          error_count: result.errors.length,
          errors: result.errors,
        });
      
      if (historyError) {
        console.error('Failed to save import history:', historyError);
      }

      console.log(`Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);

      return new Response(
        JSON.stringify({
          success: true,
          imported: result.imported,
          skipped: result.skipped,
          errors: result.errors.slice(0, 50), // Limit error details returned
          total_rows: limitedRows.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "test" or "import".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
