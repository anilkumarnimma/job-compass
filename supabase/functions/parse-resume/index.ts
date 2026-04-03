import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { file_base64, filename, mime_type } = await req.json();
    if (!file_base64 || !filename) {
      return new Response(JSON.stringify({ error: "file_base64 and filename required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isDocx = mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
      || mime_type === "application/msword"
      || filename.toLowerCase().endsWith(".docx") 
      || filename.toLowerCase().endsWith(".doc");

    let contentPayload: any[];
    
    if (isDocx) {
      // DOCX/DOC: extract text from the ZIP (DOCX is a ZIP of XML files)
      // We'll decode base64, unzip, and extract text from word/document.xml
      const binaryStr = atob(file_base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      
      let extractedText = "";
      try {
        // Use DecompressionStream to handle ZIP
        // DOCX is a ZIP - find word/document.xml using simple ZIP parsing
        const zip = bytes;
        const textDecoder = new TextDecoder();
        
        // Simple ZIP parser to find word/document.xml
        let offset = 0;
        const files: { name: string; data: Uint8Array; compressed: boolean }[] = [];
        
        while (offset < zip.length - 4) {
          const sig = zip[offset] | (zip[offset+1] << 8) | (zip[offset+2] << 16) | (zip[offset+3] << 24);
          if (sig !== 0x04034b50) break; // Not a local file header
          
          const compressionMethod = zip[offset + 8] | (zip[offset + 9] << 8);
          const compressedSize = zip[offset + 18] | (zip[offset + 19] << 8) | (zip[offset + 20] << 16) | (zip[offset + 21] << 24);
          const uncompressedSize = zip[offset + 22] | (zip[offset + 23] << 8) | (zip[offset + 24] << 16) | (zip[offset + 25] << 24);
          const nameLen = zip[offset + 26] | (zip[offset + 27] << 8);
          const extraLen = zip[offset + 28] | (zip[offset + 29] << 8);
          const name = textDecoder.decode(zip.slice(offset + 30, offset + 30 + nameLen));
          const dataStart = offset + 30 + nameLen + extraLen;
          const dataBytes = zip.slice(dataStart, dataStart + compressedSize);
          
          if (name === "word/document.xml" || name === "word/header1.xml" || name === "word/header2.xml") {
            if (compressionMethod === 8) {
              // Deflate compressed
              try {
                const ds = new DecompressionStream("raw");
                const writer = ds.writable.getWriter();
                writer.write(dataBytes);
                writer.close();
                const reader = ds.readable.getReader();
                const chunks: Uint8Array[] = [];
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  chunks.push(value);
                }
                const totalLen = chunks.reduce((a, c) => a + c.length, 0);
                const result = new Uint8Array(totalLen);
                let pos = 0;
                for (const chunk of chunks) {
                  result.set(chunk, pos);
                  pos += chunk.length;
                }
                files.push({ name, data: result, compressed: true });
              } catch {
                files.push({ name, data: dataBytes, compressed: false });
              }
            } else {
              files.push({ name, data: dataBytes, compressed: false });
            }
          }
          
          offset = dataStart + compressedSize;
        }
        
        // Extract text from XML by stripping tags and getting <w:t> content
        for (const f of files) {
          const xml = textDecoder.decode(f.data);
          // Extract text between <w:t> and </w:t> tags, preserving paragraph breaks
          const paragraphs = xml.split(/<\/w:p>/);
          for (const para of paragraphs) {
            const texts: string[] = [];
            const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
            let match;
            while ((match = regex.exec(para)) !== null) {
              texts.push(match[1]);
            }
            if (texts.length > 0) {
              extractedText += texts.join("") + "\n";
            }
          }
        }
      } catch (e) {
        console.error("DOCX extraction error:", e);
        // Fallback: strip all XML-like tags from raw text
        const textDecoder = new TextDecoder("utf-8", { fatal: false });
        const rawText = textDecoder.decode(bytes);
        extractedText = rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
      
      if (!extractedText.trim()) {
        return new Response(JSON.stringify({ error: "Could not extract text from the document. Please try uploading a PDF version." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      contentPayload = [
        { type: "text", text: `Parse this resume text and extract all available profile fields. Only include fields you can clearly find in the document. The filename is: ${filename}\n\nResume content:\n${extractedText}` },
      ];
    } else {
      // PDF or image: send as data URI
      const dataUri = `data:${mime_type || "application/pdf"};base64,${file_base64}`;
      contentPayload = [
        { type: "text", text: `Parse this resume and extract all available profile fields. Only include fields you can clearly find in the document. The filename is: ${filename}` },
        { type: "image_url", image_url: { url: dataUri } },
      ];
    }

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
