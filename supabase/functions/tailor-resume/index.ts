import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * NEW CONTRACT (preserve original structure):
 *
 * Request body:
 * {
 *   job_title: string,
 *   job_description: string,
 *   job_skills: string[],
 *   resume_structure: {
 *     header: { full_name: string, contact_details: string[] },
 *     summary?: string,
 *     skills: string[],
 *     sections: Array<{
 *       title: string,
 *       items: Array<{
 *         heading: string,
 *         subheading?: string,
 *         date?: string,
 *         bullets: string[],
 *       }>,
 *     }>,
 *   }
 * }
 *
 * Response: same shape, but:
 *  - summary may be rewritten (return both `summary` and `summary_original`)
 *  - skills array reordered (matching ones first); same skills, no additions
 *  - sections preserved in same order, same titles
 *  - items preserved in same order, with EXACT same heading / subheading / date
 *  - bullets preserved in same order and same count, each as
 *      { text: string, original: string, changed: boolean }
 *  - keywords_added: string[]  (just for stats)
 *  - changes_count: number     (number of bullets/summary modified)
 */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { job_title, job_description, job_skills, resume_structure } = body;

    if (!job_title) {
      return new Response(JSON.stringify({ error: "job_title is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resume_structure || !resume_structure.sections) {
      return new Response(JSON.stringify({ error: "Please upload your resume in Profile Settings to get started." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log("[TAILOR] Job:", job_title, "| sections:", resume_structure.sections?.length);

    const systemPrompt = `You are an expert ATS resume editor. You receive the candidate's actual uploaded resume in a STRUCTURED form. Your job is to MINIMALLY rewrite ONLY the wording of bullet points, the summary, and the order of skills — to better match a target job — WITHOUT changing the structure.

ABSOLUTE RULES — VIOLATIONS ARE STRICTLY FORBIDDEN:
1. NEVER change the candidate's name or contact details — return them EXACTLY as given.
2. NEVER add or remove sections. Same sections, same titles, in the same order.
3. NEVER add or remove items (jobs/projects/education entries). Keep them all, in original order.
4. For each item, NEVER change the heading (job title), subheading (company / school), or date — copy them character-for-character.
5. NEVER change the number of bullets per item. If an item has 5 bullets, return 5 bullets — same count, same order.
6. NEVER change Education entries at all (degrees, schools, dates). Pass them through verbatim.
7. NEVER fabricate companies, roles, dates, or qualifications.

ALLOWED EDITS (do these aggressively where useful):
- Rewrite each bullet's wording to naturally include keywords from the job description. The bullet's MEANING and FACTS must stay the same — only the phrasing changes.
- Strengthen weak verbs (e.g. "helped" → "spearheaded").
- Rewrite the summary to mention the target role / company naturally and include relevant keywords. Keep it to 3–5 sentences.
- Reorder the skills array so skills that match the job description appear first. DO NOT add new skills. DO NOT remove skills.

OUTPUT FORMAT — call the tool exactly. For each bullet you MUST return:
  { "text": <new wording>, "changed": <true if you changed it from the original, else false> }
If you did not edit a bullet, return text === the original bullet and changed=false.

The summary should be returned in "summary" (new wording). Set "summary_changed" to true if you changed it.

Be aggressive but truthful — aim to modify ~60% of bullets to better match the role.`;

    // Send a compact JSON of the structure so the AI can faithfully echo it back.
    const userPayload = {
      target_job_title: job_title,
      target_job_skills: (job_skills || []).slice(0, 30),
      target_job_description: (job_description || "").slice(0, 2500),
      resume: {
        header: resume_structure.header,
        summary: resume_structure.summary || "",
        skills: (resume_structure.skills || []).slice(0, 80),
        sections: (resume_structure.sections || []).map((s: any) => ({
          title: s.title,
          items: (s.items || []).map((it: any) => ({
            heading: it.heading || "",
            subheading: it.subheading || "",
            date: it.date || "",
            bullets: (it.bullets || []).map((b: any) =>
              typeof b === "string" ? b : (b?.text || ""),
            ),
          })),
        })),
      },
    };

    const toolDef = {
      type: "function",
      function: {
        name: "return_tailored_resume",
        description: "Return the same resume structure with minimal wording rewrites.",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string" },
            summary_changed: { type: "boolean" },
            skills: { type: "array", items: { type: "string" } },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        heading: { type: "string" },
                        subheading: { type: "string" },
                        date: { type: "string" },
                        bullets: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              text: { type: "string" },
                              changed: { type: "boolean" },
                            },
                            required: ["text", "changed"],
                          },
                        },
                      },
                      required: ["heading", "bullets"],
                    },
                  },
                },
                required: ["title", "items"],
              },
            },
            keywords_added: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "summary_changed", "skills", "sections", "keywords_added"],
        },
      },
    };

    const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview", "openai/gpt-5-mini"];
    const maxRetries = 2;
    let response: Response | null = null;
    let lastError = "";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const model = models[Math.min(attempt, models.length - 1)];
      console.log(`[TAILOR] Attempt ${attempt + 1} model=${model}`);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);

        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: JSON.stringify(userPayload) },
            ],
            tools: [toolDef],
            tool_choice: { type: "function", function: { name: "return_tailored_resume" } },
          }),
        });

        clearTimeout(timeout);

        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "AI service is busy. Please try again in a moment." }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI service is temporarily unavailable. Please try again later." }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.ok) break;

        lastError = await response.text();
        console.error(`[TAILOR] Attempt ${attempt + 1} failed (status ${response.status}):`, lastError.slice(0, 300));
        response = null;
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      } catch (fetchErr: any) {
        const isAbort = fetchErr?.name === "AbortError";
        lastError = isAbort ? "AI request timed out" : (fetchErr?.message || "Network error");
        console.error(`[TAILOR] Attempt ${attempt + 1} ${isAbort ? "timeout" : "error"}:`, lastError);
        response = null;
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    }

    if (!response || !response.ok) {
      console.error("[TAILOR] All attempts failed. Last error:", lastError.slice(0, 200));
      return new Response(JSON.stringify({ error: "Resume tailoring is temporarily unavailable. Please try again in a moment." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any;
    try {
      result = await response.json();
    } catch {
      return new Response(JSON.stringify({ error: "Failed to process AI response. Please try again." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return a valid resume. Please try again." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let aiOutput: any;
    try {
      aiOutput = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "AI returned invalid resume data. Please try again." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ───── ENFORCE STRUCTURE INTEGRITY ─────
    // Even if the model strays, we forcibly reconcile the AI output with the
    // original structure so headings / dates / counts can never drift.
    const original = resume_structure;
    const aiSections: any[] = Array.isArray(aiOutput.sections) ? aiOutput.sections : [];

    let changesCount = 0;
    const safeSections = (original.sections || []).map((origSec: any, sIdx: number) => {
      const aiSec = aiSections[sIdx] || {};
      const aiItems: any[] = Array.isArray(aiSec.items) ? aiSec.items : [];
      const isEducation = /education/i.test(origSec.title || "");

      return {
        title: origSec.title, // never let AI rename sections
        items: (origSec.items || []).map((origItem: any, iIdx: number) => {
          const aiItem = aiItems[iIdx] || {};
          const origBullets: string[] = (origItem.bullets || []).map((b: any) =>
            typeof b === "string" ? b : (b?.text || ""),
          );
          const aiBullets: any[] = Array.isArray(aiItem.bullets) ? aiItem.bullets : [];

          const bullets = origBullets.map((origText, bIdx) => {
            // Education or contact-ish sections: pass through verbatim, never count as changed
            if (isEducation) {
              return { text: origText, original: origText, changed: false };
            }
            const aiB = aiBullets[bIdx];
            const newText = (aiB && typeof aiB.text === "string" && aiB.text.trim())
              ? aiB.text
              : origText;
            const changed = newText.trim() !== origText.trim();
            if (changed) changesCount++;
            return { text: newText, original: origText, changed };
          });

          return {
            heading: origItem.heading || "",   // preserved verbatim
            subheading: origItem.subheading || "",
            date: origItem.date || "",
            bullets,
          };
        }),
      };
    });

    // Skills: only allow REORDERING of the original skills set. Never add/remove.
    const origSkills: string[] = (original.skills || []).map((s: string) => String(s));
    const lowerOrig = new Set(origSkills.map((s) => s.toLowerCase().trim()));
    let safeSkills = origSkills;
    if (Array.isArray(aiOutput.skills)) {
      const seen = new Set<string>();
      const reordered: string[] = [];
      for (const s of aiOutput.skills) {
        const key = String(s || "").toLowerCase().trim();
        if (lowerOrig.has(key) && !seen.has(key)) {
          seen.add(key);
          // find original casing
          const match = origSkills.find((o) => o.toLowerCase().trim() === key);
          if (match) reordered.push(match);
        }
      }
      // Append any originals the AI dropped — to preserve completeness
      for (const s of origSkills) {
        const key = s.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          reordered.push(s);
        }
      }
      safeSkills = reordered;
    }

    // Summary: keep the AI rewrite (only rewording is allowed)
    const origSummary = String(original.summary || "");
    const newSummary = typeof aiOutput.summary === "string" && aiOutput.summary.trim()
      ? aiOutput.summary
      : origSummary;
    const summaryChanged = !!origSummary && newSummary.trim() !== origSummary.trim();
    if (summaryChanged) changesCount++;

    const tailored = {
      header: original.header, // never let AI touch this
      summary: newSummary,
      summary_original: origSummary,
      summary_changed: summaryChanged,
      skills: safeSkills,
      sections: safeSections,
      keywords_added: Array.isArray(aiOutput.keywords_added) ? aiOutput.keywords_added.slice(0, 25) : [],
      changes_count: changesCount,
    };

    console.log("[TAILOR] Done. Changes:", changesCount, "| sections:", safeSections.length);

    return new Response(JSON.stringify(tailored), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[TAILOR] Unhandled error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
