import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[TAILOR] Function started");

    // Auth guard
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[TAILOR] No auth header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      console.log("[TAILOR] Auth failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[TAILOR] User authenticated:", authUser.id);

    let body: any;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("[TAILOR] Failed to parse request body:", parseErr);
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { job_title, job_description, job_skills, resume_intelligence, resume_text, base_resume } = body;

    if (!job_title) {
      console.log("[TAILOR] Missing job_title");
      return new Response(JSON.stringify({ error: "job_title is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Check if we have enough resume data to work with
    const hasResumeData = resume_text || resume_intelligence || (base_resume?.sections?.length > 0);
    if (!hasResumeData) {
      console.log("[TAILOR] Insufficient resume data");
      return new Response(JSON.stringify({ error: "Please upload your resume first or complete your profile to generate a tailored resume." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[TAILOR] Generating for job:", job_title, "| has base_resume:", !!base_resume, "| has resume_text:", !!resume_text, "| has intelligence:", !!resume_intelligence);

    const systemPrompt = `You are an expert ATS resume optimizer. You tailor a candidate's existing resume for a specific job posting.

ABSOLUTE MANDATORY RULES — NEVER EVER CHANGE THESE:
0. The uploaded/base resume structure is the source of truth. Preserve the same header identity, section order, section titles, core entries, company names, job titles, education entries, and dates exactly.
1. Company names — copy them EXACTLY character-for-character from the candidate's resume. Do NOT rename, abbreviate, expand, normalize, or replace any company name. If the resume says "Acme Corp", output "Acme Corp" exactly. If it says "ABC Technologies Pvt Ltd", output "ABC Technologies Pvt Ltd" exactly.
2. Job titles / role names — keep EXACTLY as written in the resume
3. Employment dates / years — keep EXACTLY as written in the resume
4. Education institution names — keep EXACTLY as written in the resume
5. Education degrees — keep EXACTLY as written in the resume
6. Education dates / years — keep EXACTLY as written in the resume
7. Project names — keep EXACTLY as written in the resume
8. Header / top contact details — keep the candidate name and contact details from the base resume exactly as provided
9. Do NOT remove sections that exist in the base resume. Keep the resume complete from top to bottom.

VIOLATION OF THE ABOVE RULES IS STRICTLY FORBIDDEN. These are the candidate's real career facts.

ALLOWED OPTIMIZATIONS — DO these aggressively:
- Add missing relevant keywords from the job description into existing bullet points naturally
- Strengthen action verbs (e.g. "helped" → "spearheaded", "did" → "engineered")
- Add new realistic bullet points that align with the candidate's actual skills/experience
- Quantify achievements where plausible (e.g. "improved performance" → "improved performance by 40%")
- Reorder bullet points to prioritize the most relevant ones for this job first
- Add missing skills to the skills section IF the candidate plausibly has them based on their experience
- Preserve the same overall resume structure and section ordering from the base resume

PROFESSIONAL SUMMARY REQUIREMENT (CRITICAL):
- The summary field MUST be a strong, detailed professional summary of exactly 5-6 sentences (NOT a one-liner).
- It must read as a single cohesive paragraph placed at the top of the resume.
- Content requirements for the summary:
  1. Open with a compelling statement about the candidate's total years of experience, core domain, and professional identity.
  2. Highlight the candidate's strongest technical skills and technologies that align with the target job description.
  3. Mention specific domains, industries, or problem areas the candidate has worked in.
  4. Include measurable impact or scale where realistic.
  5. Reference leadership, collaboration, or cross-functional abilities if supported by the resume.
  6. Close with a forward-looking statement tying the candidate's strengths to the target role's requirements.
- Use ATS-optimized keywords from the job description naturally throughout the summary.
- Tone must be professional, confident, and impactful.
- Do NOT use generic filler phrases like "team player" or "hard worker" without specific context.
- The summary must truthfully reflect the candidate's actual experience from the resume — do NOT fabricate claims.

BULLET POINT DEPTH REQUIREMENT (CRITICAL):
- Every experience/work role MUST have exactly 6-7 bullet points. No fewer than 6.
- Each bullet must start with a strong action verb.
- Each bullet must be technically detailed, mentioning specific technologies, tools, frameworks, or methodologies relevant to the target job.
- Each bullet must demonstrate impact, scale, or measurable contribution.
- Expand existing short bullets into richer, more detailed statements.
- Add realistic new bullets that align with the candidate's role, tools, and industry — but do NOT fabricate fake projects or companies.
- Avoid generic filler bullets.
- Prioritize bullets that align with the target job description's requirements and keywords.

NEVER fabricate fake companies, fake roles, fake projects, or fake dates.

TARGET: 95%+ ATS match score through keyword alignment and bullet optimization, NOT through fabrication.

Return JSON using the tool provided.`;

    const desc = (job_description || "").slice(0, 1200);
    const skills = (job_skills || []).join(", ");
    const resumeContent = resume_text || (resume_intelligence ? JSON.stringify(resume_intelligence) : "No resume provided");
    const baseResumeStr = base_resume ? JSON.stringify(base_resume).slice(0, 5000) : "No structured base resume provided";

    const userPrompt = `TARGET JOB: ${job_title}
REQUIRED SKILLS: ${skills}
JOB DESCRIPTION: ${desc}

BASE RESUME STRUCTURE TO PRESERVE EXACTLY:
${baseResumeStr}

CANDIDATE'S CURRENT RESUME (preserve ALL company names, titles, dates, education EXACTLY):
${typeof resumeContent === 'string' ? resumeContent.slice(0, 2500) : JSON.stringify(resumeContent).slice(0, 2500)}

IMPORTANT REMINDER: Copy every company name, job title, date, education detail, header detail, and section order EXACTLY from the base resume above. Do NOT change them. Only optimize bullet points, skills, summary, and keyword alignment.`;

    const toolDef = {
      type: "function",
      function: {
        name: "return_tailored_resume",
        description: "Return the tailored resume content",
        parameters: {
          type: "object",
          properties: {
            header: {
              type: "object",
              description: "Resume header copied from the base resume exactly",
              properties: {
                full_name: { type: "string" },
                headline: { type: "string" },
                contact_details: { type: "array", items: { type: "string" } },
              },
              required: ["full_name", "contact_details"],
            },
            summary: { type: "string", description: "5-6 sentence professional summary paragraph tailored to this job." },
            sections: {
              type: "array",
              description: "Resume sections preserving original order, titles, headings, dates exactly",
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
                        bullets: { type: "array", items: { type: "string" } },
                      },
                      required: ["heading"],
                    },
                  },
                },
                required: ["title", "items"],
              },
            },
            skills_section: { type: "array", items: { type: "string" } },
            keywords_added: { type: "array", items: { type: "string" } },
            optimization_notes: { type: "string" },
          },
          required: ["header", "summary", "sections", "skills_section", "keywords_added", "optimization_notes"],
        },
      },
    };

    const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview", "openai/gpt-5-mini"];
    const maxRetries = 2;
    let response: Response | null = null;
    let lastError = "";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const model = models[Math.min(attempt, models.length - 1)];
      console.log(`[TAILOR] Attempt ${attempt + 1}/${maxRetries + 1} with model: ${model}`);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000); // 55s timeout to stay within edge function limits

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
              { role: "user", content: userPrompt },
            ],
            tools: [toolDef],
            tool_choice: { type: "function", function: { name: "return_tailored_resume" } },
          }),
        });

        clearTimeout(timeout);

        if (response.status === 429) {
          console.log("[TAILOR] Rate limited");
          return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (response.status === 402) {
          console.log("[TAILOR] Credits exhausted");
          return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (response.ok) {
          console.log(`[TAILOR] AI response OK on attempt ${attempt + 1}`);
          break;
        }

        lastError = await response.text();
        console.error(`[TAILOR] AI attempt ${attempt + 1} failed (model: ${model}, status: ${response.status}):`, lastError.slice(0, 300));
        response = null;

        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      } catch (fetchErr: any) {
        const isAbort = fetchErr?.name === "AbortError";
        console.error(`[TAILOR] Attempt ${attempt + 1} ${isAbort ? "timed out" : "error"}:`, fetchErr?.message || fetchErr);
        lastError = isAbort ? "AI request timed out" : (fetchErr?.message || "Network error");
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
    } catch (jsonErr) {
      console.error("[TAILOR] Failed to parse AI response JSON:", jsonErr);
      return new Response(JSON.stringify({ error: "Failed to process AI response. Please try again." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("[TAILOR] No tool call in AI response. Keys:", Object.keys(result || {}));
      return new Response(JSON.stringify({ error: "AI did not return a valid resume. Please try again." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let tailoredResume: any;
    try {
      tailoredResume = JSON.parse(toolCall.function.arguments);
    } catch (parseErr) {
      console.error("[TAILOR] Failed to parse tool call arguments:", parseErr);
      return new Response(JSON.stringify({ error: "AI returned invalid resume data. Please try again." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate essential fields
    if (!tailoredResume.header || !tailoredResume.sections) {
      console.error("[TAILOR] Missing essential fields in tailored resume");
      return new Response(JSON.stringify({ error: "AI returned incomplete resume. Please try again." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure arrays exist
    tailoredResume.skills_section = tailoredResume.skills_section || [];
    tailoredResume.keywords_added = tailoredResume.keywords_added || [];
    tailoredResume.optimization_notes = tailoredResume.optimization_notes || "";
    tailoredResume.header.contact_details = tailoredResume.header.contact_details || [];

    console.log("[TAILOR] Success - sections:", tailoredResume.sections?.length, "skills:", tailoredResume.skills_section?.length);

    return new Response(JSON.stringify(tailoredResume), {
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
