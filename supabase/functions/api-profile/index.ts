import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return structured profile with empty defaults instead of null
    const education = profile.education || {};

    const structured = {
      user: { id: user.id, email: user.email || "" },
      profile: {
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        full_name: profile.full_name || "",
        email: profile.email || user.email || "",
        phone: profile.phone || "",
        city: profile.city || "",
        state: profile.state || "",
        zip: profile.zip || "",
        location: profile.location || "",
        linkedin_url: profile.linkedin_url || "",
        github_url: profile.github_url || "",
        portfolio_url: profile.portfolio_url || "",
        work_authorization: profile.work_authorization || "",
        visa_status: profile.visa_status || "",
        experience_years: profile.experience_years ?? 0,
        current_company: profile.current_company || "",
        current_title: profile.current_title || "",
        skills: profile.skills || [],
        education: {
          school: education.school || "",
          degree: education.degree || "",
          major: education.major || "",
          graduation_year: education.graduation_year || "",
        },
        resume_url: profile.resume_url || "",
        resume_filename: profile.resume_filename || "",
        is_premium: profile.is_premium || false,
      },
    };

    return new Response(JSON.stringify(structured), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
