import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { job_title, job_description, job_skills, resume_intelligence } = await req.json();

    if (!job_title || !job_description) {
      return new Response(JSON.stringify({ error: "Missing job details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasResume = resume_intelligence && resume_intelligence.primaryRole;

    const resumeContext = hasResume
      ? `
CANDIDATE RESUME PROFILE:
- Primary Role: ${resume_intelligence.primaryRole}
- Experience Level: ${resume_intelligence.experienceLevel}
- Years of Experience: ${resume_intelligence.yearsOfExperience || "Unknown"}
- Top Skills: ${(resume_intelligence.topSkills || []).join(", ")}
- Secondary Skills: ${(resume_intelligence.secondarySkills || []).join(", ")}
- Current Domain: ${resume_intelligence.currentDomain || "N/A"}
- Strength Summary: ${resume_intelligence.strengthSummary || "N/A"}
- Unique Selling Point: ${resume_intelligence.uniqueSellingPoint || "N/A"}
- Career Trajectory: ${resume_intelligence.careerTrajectory || "N/A"}
- Improvement Areas: ${(resume_intelligence.improvementAreas || []).join(", ")}
`
      : "No resume uploaded — generate prep based on job description only.";

    const systemPrompt = `You are a world-class AI interview coach. Generate a highly specific, personalized interview preparation guide. Output valid JSON only, no markdown.`;

    const userPrompt = `Generate interview prep for this specific job:

JOB TITLE: ${job_title}
JOB DESCRIPTION: ${job_description}
REQUIRED SKILLS: ${(job_skills || []).join(", ")}

${resumeContext}

Return JSON with this exact structure:
{
  "keySkills": ["list of 5-8 key skills to focus on for this specific role"],
  "resumeMatch": {
    "strengths": ["3-5 matching strengths between resume and job"],
    "gaps": ["2-4 skill gaps or areas to improve"],
    "matchSummary": "2-3 sentence summary of how the candidate matches this role"
  },
  "technicalQuestions": [
    { "question": "specific technical question", "suggestedAnswer": "personalized answer using candidate background", "difficulty": "easy|medium|hard" }
  ],
  "behavioralQuestions": [
    { "question": "behavioral question", "suggestedAnswer": "personalized STAR-format answer", "tip": "brief coaching tip" }
  ],
  "tailoredAnswers": [
    { "question": "Tell me about yourself", "answer": "personalized answer tailored to this job and resume" },
    { "question": "Why are you a fit for this role?", "answer": "personalized answer" },
    { "question": "What is your biggest weakness?", "answer": "personalized answer" }
  ],
  "studyTopics": ["5-8 most important topics to study before the interview"],
  "interviewTips": ["3-5 specific tips for this particular role/company"]
}

Generate 4-5 technical questions and 3-4 behavioral questions. Make every answer personalized to the candidate's background and this specific job. If no resume, still generate strong job-specific prep.`;

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
              name: "return_interview_prep",
              description: "Return structured interview prep data",
              parameters: {
                type: "object",
                properties: {
                  keySkills: { type: "array", items: { type: "string" } },
                  resumeMatch: {
                    type: "object",
                    properties: {
                      strengths: { type: "array", items: { type: "string" } },
                      gaps: { type: "array", items: { type: "string" } },
                      matchSummary: { type: "string" },
                    },
                    required: ["strengths", "gaps", "matchSummary"],
                  },
                  technicalQuestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        suggestedAnswer: { type: "string" },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                      },
                      required: ["question", "suggestedAnswer", "difficulty"],
                    },
                  },
                  behavioralQuestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        suggestedAnswer: { type: "string" },
                        tip: { type: "string" },
                      },
                      required: ["question", "suggestedAnswer", "tip"],
                    },
                  },
                  tailoredAnswers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        answer: { type: "string" },
                      },
                      required: ["question", "answer"],
                    },
                  },
                  studyTopics: { type: "array", items: { type: "string" } },
                  interviewTips: { type: "array", items: { type: "string" } },
                },
                required: ["keySkills", "resumeMatch", "technicalQuestions", "behavioralQuestions", "tailoredAnswers", "studyTopics", "interviewTips"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_interview_prep" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call response");

    const prep = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ prep }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("interview-prep error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
