import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { job_title, job_description, job_skills, resume_intelligence, resume_text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert ATS resume optimizer. You tailor a candidate's existing resume for a specific job posting.

ABSOLUTE MANDATORY RULES — NEVER EVER CHANGE THESE:
1. Company names — copy them EXACTLY character-for-character from the candidate's resume. Do NOT rename, abbreviate, expand, normalize, or replace any company name. If the resume says "Acme Corp", output "Acme Corp" exactly. If it says "ABC Technologies Pvt Ltd", output "ABC Technologies Pvt Ltd" exactly.
2. Job titles / role names — keep EXACTLY as written in the resume
3. Employment dates / years — keep EXACTLY as written in the resume
4. Education institution names — keep EXACTLY as written in the resume
5. Education degrees — keep EXACTLY as written in the resume
6. Education dates / years — keep EXACTLY as written in the resume
7. Project names — keep EXACTLY as written in the resume

VIOLATION OF THE ABOVE RULES IS STRICTLY FORBIDDEN. These are the candidate's real career facts.

ALLOWED OPTIMIZATIONS — DO these aggressively:
- Add missing relevant keywords from the job description into existing bullet points naturally
- Strengthen action verbs (e.g. "helped" → "spearheaded", "did" → "engineered")
- Add new realistic bullet points that align with the candidate's actual skills/experience
- Quantify achievements where plausible (e.g. "improved performance" → "improved performance by 40%")
- Reorder bullet points to prioritize the most relevant ones for this job first
- Add missing skills to the skills section IF the candidate plausibly has them based on their experience
- Optimize the summary/objective to directly address the job requirements

NEVER fabricate fake companies, fake roles, fake projects, or fake dates.

TARGET: 95%+ ATS match score through keyword alignment and bullet optimization, NOT through fabrication.

Return JSON using the tool provided. Be concise and fast.`;

    const desc = (job_description || "").slice(0, 1200);
    const skills = (job_skills || []).join(", ");
    const resumeContent = resume_text || (resume_intelligence ? JSON.stringify(resume_intelligence) : "No resume provided");

    const userPrompt = `TARGET JOB: ${job_title}
REQUIRED SKILLS: ${skills}
JOB DESCRIPTION: ${desc}

CANDIDATE'S CURRENT RESUME (preserve ALL company names, titles, dates, education EXACTLY):
${typeof resumeContent === 'string' ? resumeContent.slice(0, 2500) : JSON.stringify(resumeContent).slice(0, 2500)}

IMPORTANT REMINDER: Copy every company name, job title, date, and education detail EXACTLY from the resume above. Do NOT change them. Only optimize bullet points, skills, summary, and keyword alignment.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_tailored_resume",
              description: "Return the tailored resume content",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Professional summary tailored to this specific job (2-3 sentences)",
                  },
                  sections: {
                    type: "array",
                    description: "Resume sections. CRITICAL: heading/subheading/date must be copied EXACTLY from the original resume",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              heading: { type: "string", description: "EXACT original job title or degree from resume — DO NOT CHANGE" },
                              subheading: { type: "string", description: "EXACT original company or institution name from resume — DO NOT CHANGE" },
                              date: { type: "string", description: "EXACT original date range from resume — DO NOT CHANGE" },
                              bullets: {
                                type: "array",
                                items: { type: "string" },
                                description: "Bullet points optimized for ATS with strong verbs and keywords",
                              },
                            },
                            required: ["heading"],
                          },
                        },
                      },
                      required: ["title", "items"],
                    },
                  },
                  skills_section: {
                    type: "array",
                    items: { type: "string" },
                    description: "Skills list optimized and expanded for this job",
                  },
                  keywords_added: {
                    type: "array",
                    items: { type: "string" },
                    description: "Keywords from job description incorporated",
                  },
                  optimization_notes: {
                    type: "string",
                    description: "Brief optimization note (1 sentence)",
                  },
                },
                required: ["summary", "sections", "skills_section", "keywords_added", "optimization_notes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_tailored_resume" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const tailoredResume = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(tailoredResume), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tailor-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
