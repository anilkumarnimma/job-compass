-- Unschedule ATS cron jobs (idempotent)
DO $$ BEGIN PERFORM cron.unschedule('ats-discovery-weekly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('ats-ingest-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('ats-mark-stuck-runs'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('ats-ingest-tier1'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('ats-ingest-tier2'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('ats-ingest-tier3'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Drop helper function used only by ATS
DROP FUNCTION IF EXISTS public.mark_stuck_ats_runs();

-- Drop ATS Company Discovery tables
DROP TABLE IF EXISTS public.ats_discovery_runs CASCADE;
DROP TABLE IF EXISTS public.ats_ingest_runs CASCADE;
DROP TABLE IF EXISTS public.ats_companies CASCADE;

-- Drop JSearch tables
DROP TABLE IF EXISTS public.jsearch_ingest_runs CASCADE;
DROP TABLE IF EXISTS public.jsearch_query_seeds CASCADE;