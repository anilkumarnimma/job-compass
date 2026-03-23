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

    const systemPrompt = `You are an expert ATS resume optimizer. Your job is to take a candidate's existing resume content and tailor it for a specific job posting.

RULES:
- PRESERVE the original resume structure, section ordering, and formatting style exactly
- NEVER fabricate experience, projects, companies, degrees, or skills the candidate doesn't have
- Optimize for ATS keyword matching by naturally incorporating relevant keywords from the job description into existing bullet points
- Strengthen action verbs and quantify achievements where possible
- Reorder bullet points within sections to prioritize the most relevant ones for this job
- If the candidate has a skill mentioned in the job but not prominently featured, elevate it
- Target 90-95% ATS match score through keyword alignment and relevance optimization
- Keep the same professional tone as the original resume

Return a JSON object using the tool provided.`;

    const desc = (job_description || "").slice(0, 1500);
    const skills = (job_skills || []).join(", ");
    const resumeContent = resume_text || (resume_intelligence ? JSON.stringify(resume_intelligence) : "No resume provided");

    const userPrompt = `JOB TITLE: ${job_title}
JOB DESCRIPTION: ${desc}
REQUIRED SKILLS: ${skills}

CANDIDATE RESUME DATA:
${typeof resumeContent === 'string' ? resumeContent.slice(0, 3000) : JSON.stringify(resumeContent).slice(0, 3000)}

Tailor this resume for the job above. Preserve the original format and structure. Optimize aggressively for ATS but never fabricate experience.`;

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
                    description: "Resume sections in order, preserving original structure",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Section heading e.g. Experience, Skills, Education" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              heading: { type: "string", description: "Item heading (job title, degree, etc.)" },
                              subheading: { type: "string", description: "Company/institution name" },
                              date: { type: "string", description: "Date range" },
                              bullets: {
                                type: "array",
                                items: { type: "string" },
                                description: "Bullet points, optimized for ATS",
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
                    description: "Skills list optimized and reordered for this job",
                  },
                  keywords_added: {
                    type: "array",
                    items: { type: "string" },
                    description: "Keywords from job description that were naturally incorporated",
                  },
                  optimization_notes: {
                    type: "string",
                    description: "Brief note on what was optimized (1-2 sentences)",
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
