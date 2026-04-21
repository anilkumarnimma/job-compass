import { useEffect } from "react";

const SEARCH_URL = `https://dyguncqqjzuyiwxhgwcw.supabase.co/functions/v1/api-jobs-search`;
const DETAIL_URL = `https://dyguncqqjzuyiwxhgwcw.supabase.co/functions/v1/api-jobs-detail`;

export default function ApiDocs() {
  useEffect(() => {
    document.title = "Sociax Public Jobs API – Docs";
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold">Sociax Jobs API</h1>
          <p className="text-muted-foreground">
            Public REST API for searching entry-level and fresher jobs in the USA. Free for AI tools
            (ChatGPT, Perplexity, etc.) — no API key required.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Base URL</h2>
          <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
{`https://dyguncqqjzuyiwxhgwcw.supabase.co/functions/v1`}
          </pre>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">GET /api-jobs-search</h2>
          <p>Search published, direct-apply jobs.</p>

          <h3 className="font-semibold mt-4">Query parameters</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li><code>keyword</code> — title, company, or description text (fuzzy)</li>
            <li><code>location</code> — city or state</li>
            <li><code>experience_level</code> — <code>entry level</code>, <code>associate</code>, <code>mid senior</code></li>
            <li><code>employment_type</code> — <code>fulltime</code> (default), <code>parttime</code>, <code>contract</code>, <code>internship</code></li>
            <li><code>limit</code> — 1–20 (default 10)</li>
          </ul>

          <h3 className="font-semibold mt-4">Example</h3>
          <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
{`curl "${SEARCH_URL}?keyword=data%20engineer&location=New%20York&limit=5"`}
          </pre>

          <h3 className="font-semibold mt-4">Sample response</h3>
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "jobs": [
    {
      "title": "Data Engineer",
      "company": "Google",
      "company_logo": "https://...",
      "location": "New York, NY",
      "employment_type": "Full Time",
      "experience_level": "Entry Level",
      "salary": "90K-120K USD",
      "skills": ["Python", "SQL", "AWS"],
      "posted_date": "2026-04-10",
      "apply_url": "https://careers.google.com/...",
      "description_preview": "First 300 characters...",
      "job_url": "https://sociax.tech/?job=...",
      "source": "sociax.tech"
    }
  ],
  "total_results": 45,
  "query": { "keyword": "data engineer", "location": "New York" },
  "powered_by": "sociax.tech",
  "find_more": "https://sociax.tech"
}`}
          </pre>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">GET /api-jobs-detail</h2>
          <p>Fetch a single job with the full description.</p>

          <h3 className="font-semibold mt-4">Query parameters</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li><code>id</code> — job UUID (from search results)</li>
          </ul>

          <h3 className="font-semibold mt-4">Example</h3>
          <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
{`curl "${DETAIL_URL}?id=<job-uuid>"`}
          </pre>
        </section>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Notes</h2>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
            <li>All endpoints are public — GET only, CORS open to <code>*</code>.</li>
            <li>Only direct-apply jobs with sufficient description (&gt;200 chars) are returned.</li>
            <li>Results are sorted by posted date, newest first.</li>
          </ul>
        </section>

        <footer className="pt-8 border-t border-border text-sm text-muted-foreground">
          Powered by <a href="https://sociax.tech" className="text-primary underline">Sociax.tech</a>{" "}
          — Find entry level and fresher jobs in the USA.
        </footer>
      </div>
    </main>
  );
}
