import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Suggestion {
  suggestion: string;
  match_count: number;
}

export function useSearchSuggestions(query: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // Abort previous in-flight request
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc("suggest_job_titles", {
          query_text: query.trim(),
          max_results: 8,
        });
        if (!error && data) {
          setSuggestions(data as Suggestion[]);
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [query, enabled]);

  return { suggestions, isLoading };
}
