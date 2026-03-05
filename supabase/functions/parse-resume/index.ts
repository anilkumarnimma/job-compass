import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { file_base64, filename, mime_type } = await req.json();
    if (!file_base64 || !filename) {
      return new Response(JSON.stringify({ error: "file_base64 and filename required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUri = `data:${mime_type || "application/pdf"};base64,${file_base64}`;

    const extractionTool = {
      type: "function",
      function: {
        name: "extract_resume_fields",
        description: "Extract structured profile fields from a resume document. Only include fields that are clearly present. Do NOT guess or infer missing values.",
        parameters: {
          type: "object",
          properties: {
            first_name: { type: "string", description: "First name" },
            last_name: { type: "string", description: "Last name" },
            email: { type: "string", description: "Email address" },
            phone: { type: "string", description: "Phone number" },
            city: { type: "string", description: "City" },
            state: { type: "string", description: "State/Province" },
            zip: { type: "string", description: "ZIP/Postal code" },
            address: { type: "string", description: "Street address" },
            linkedin_url: { type: "string", description: "LinkedIn profile URL" },
            github_url: { type: "string", description: "GitHub profile URL" },
            portfolio_url: { type: "string", description: "Portfolio or personal website URL" },
            skills: {
              type: "array",
              items: { type: "string" },
              description: "List of skills found",
            },
            work_experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  company: { type: "string" },
                  start_date: { type: "string", description: "Start date in YYYY-MM format" },
                  end_date: { type: "string", description: "End date in YYYY-MM format, empty if current" },
                  is_current: { type: "boolean" },
                  location: { type: "string" },
                  description: { type: "string" },
                },
                required: ["title", "company"],
              },
            },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  school: { type: "string" },
                  degree: { type: "string" },
                  major: { type: "string", description: "Field of study" },
                  graduation_year: { type: "string" },
                  gpa: { type: "string" },
                },
                required: ["school"],
              },
            },
            certifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  issuer: { type: "string" },
                  date_obtained: { type: "string" },
                  expiration_date: { type: "string" },
                },
                required: ["name"],
              },
            },
            summary: { type: "string", description: "Professional summary or objective" },
            experience_years: { type: "integer", description: "Total years of experience if stated" },
          },
          required: [],
          additionalProperties: false,
        },
      },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a resume parser. Extract ONLY information that is explicitly stated in the resume. Do NOT guess, infer, or fabricate any values. If a field is not found, omit it entirely. For dates, use YYYY-MM format. For skills, extract individual skill names as separate array items.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Parse this resume and extract all available profile fields. Only include fields you can clearly find in the document. The filename is: ${filename}` },
              { type: "image_url", image_url: { url: dataUri } },
            ],
          },
        ],
        tools: [extractionTool],
        tool_choice: { type: "function", function: { name: "extract_resume_fields" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No extraction result from AI");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ extracted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-resume error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
