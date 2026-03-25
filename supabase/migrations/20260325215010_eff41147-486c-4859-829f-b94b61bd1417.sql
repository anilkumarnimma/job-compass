
CREATE TABLE public.auto_apply_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL,
  external_url text NOT NULL,
  tailored_resume jsonb,
  cover_letter text,
  profile_data jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);

ALTER TABLE public.auto_apply_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queue" ON public.auto_apply_queue
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue" ON public.auto_apply_queue
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue" ON public.auto_apply_queue
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_auto_apply_queue_user_status ON public.auto_apply_queue (user_id, status);
CREATE INDEX idx_auto_apply_queue_url ON public.auto_apply_queue (external_url);
