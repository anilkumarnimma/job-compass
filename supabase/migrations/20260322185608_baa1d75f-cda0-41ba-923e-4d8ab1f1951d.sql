
CREATE OR REPLACE FUNCTION public.search_jobs(
  search_query text DEFAULT NULL,
  page_size integer DEFAULT 25,
  page_offset integer DEFAULT 0,
  filter_tab text DEFAULT 'all',
  expanded_terms text[] DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  company text,
  company_logo text,
  location text,
  description text,
  skills text[],
  external_apply_link text,
  is_published boolean,
  is_reviewing boolean,
  salary_range text,
  employment_type text,
  experience_years text,
  posted_date timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  is_archived boolean,
  rank real
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  today_start timestamptz := date_trunc('day', now());
  yesterday_start timestamptz := date_trunc('day', now() - interval '1 day');
  week_ago timestamptz := date_trunc('day', now() - interval '7 days');
  clean_query text;
  has_query boolean;
  has_expanded boolean;
BEGIN
  clean_query := trim(search_query);
  has_query := clean_query IS NOT NULL AND clean_query != '';
  has_expanded := expanded_terms IS NOT NULL AND array_length(expanded_terms, 1) > 0;

  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.company,
    j.company_logo,
    j.location,
    j.description,
    j.skills,
    j.external_apply_link,
    j.is_published,
    j.is_reviewing,
    j.salary_range,
    j.employment_type,
    j.experience_years,
    j.posted_date,
    j.created_at,
    j.updated_at,
    j.is_archived,
    CASE
      -- Exact FTS match gets highest rank
      WHEN has_query AND j.search_vector @@ websearch_to_tsquery('english', clean_query)
      THEN ts_rank(j.search_vector, websearch_to_tsquery('english', clean_query)) + 1.0
      -- Exact ILIKE on title
      WHEN has_query AND j.title ILIKE '%' || clean_query || '%'
      THEN 0.8
      -- Exact ILIKE on company/location
      WHEN has_query AND (j.company ILIKE '%' || clean_query || '%' OR j.location ILIKE '%' || clean_query || '%')
      THEN 0.5
      -- Expanded synonym match on title (lower rank so exact matches come first)
      WHEN has_expanded AND EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et WHERE j.title ILIKE '%' || et || '%'
      )
      THEN 0.3
      -- Expanded synonym match on skills
      WHEN has_expanded AND EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et
        WHERE EXISTS (SELECT 1 FROM unnest(j.skills) sk WHERE sk ILIKE '%' || et || '%')
      )
      THEN 0.15
      -- Expanded match in description (lowest)
      WHEN has_expanded AND EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et WHERE j.description ILIKE '%' || et || '%'
      )
      THEN 0.05
      WHEN NOT has_query
      THEN 0
      ELSE 0.01
    END as rank
  FROM public.jobs j
  WHERE
    j.is_published = true
    AND j.is_archived = false
    AND (
      NOT has_query AND NOT has_expanded
      -- Original exact matching
      OR (has_query AND (
        j.search_vector @@ websearch_to_tsquery('english', clean_query)
        OR j.company ILIKE '%' || clean_query || '%'
        OR j.title ILIKE '%' || clean_query || '%'
        OR j.location ILIKE '%' || clean_query || '%'
      ))
      -- Expanded synonym matching
      OR (has_expanded AND (
        EXISTS (SELECT 1 FROM unnest(expanded_terms) et WHERE j.title ILIKE '%' || et || '%')
        OR EXISTS (SELECT 1 FROM unnest(expanded_terms) et WHERE EXISTS (SELECT 1 FROM unnest(j.skills) sk WHERE sk ILIKE '%' || et || '%'))
        OR EXISTS (SELECT 1 FROM unnest(expanded_terms) et WHERE j.description ILIKE '%' || et || '%')
      ))
    )
    AND (
      CASE filter_tab
        WHEN 'today' THEN j.posted_date >= today_start
        WHEN 'yesterday' THEN j.posted_date >= yesterday_start AND j.posted_date < today_start
        WHEN 'week' THEN j.posted_date >= week_ago AND j.posted_date < yesterday_start
        ELSE true
      END
    )
  ORDER BY rank DESC, j.posted_date DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;
