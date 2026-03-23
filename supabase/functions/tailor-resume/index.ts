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

    const systemPrompt = `You are an expert ATS resume optimizer. Tailor a candidate's resume for a specific job posting.

STRICT PRESERVATION RULES — NEVER change:
- Company names (keep exactly as-is)
- Job titles / role names (keep exactly as-is)
- Employment dates / years (keep exactly as-is)
- Education institutions, degrees, and dates (keep exactly as-is)
- Project names (keep exactly as-is)

ALLOWED OPTIMIZATIONS — DO aggressively:
- Add missing relevant keywords from the job description into existing bullet points naturally
- Strengthen action verbs (e.g. "helped" → "spearheaded", "did" → "engineered")
- Add new realistic bullet points that align with the candidate's actual skills/experience
- Quantify achievements where plausible (e.g. "improved performance" → "improved performance by 40%")
- Reorder bullet points to prioritize the most relevant ones for this job first
- Add missing skills to the skills section IF the candidate plausibly has them based on their experience
- Optimize the summary/objective to directly address the job requirements

TARGET: 95%+ ATS match score through keyword alignment, not fabrication.

Return JSON using the tool provided. Be concise and fast.`;

    const desc = (job_description || "").slice(0, 1200);
    const skills = (job_skills || []).join(", ");
    const resumeContent = resume_text || (resume_intelligence ? JSON.stringify(resume_intelligence) : "No resume provided");

    const userPrompt = `JOB: ${job_title}
SKILLS REQUIRED: ${skills}
DESCRIPTION: ${desc}

RESUME:
${typeof resumeContent === 'string' ? resumeContent.slice(0, 2500) : JSON.stringify(resumeContent).slice(0, 2500)}

Tailor this resume. Preserve all company names, roles, dates, education exactly. Optimize bullets and keywords aggressively for ATS.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
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
                    description: "Resume sections preserving original structure and identity data exactly",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              heading: { type: "string", description: "Original job title or degree - DO NOT change" },
                              subheading: { type: "string", description: "Original company or institution - DO NOT change" },
                              date: { type: "string", description: "Original date range - DO NOT change" },
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
