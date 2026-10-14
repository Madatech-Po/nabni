-- Migration: 003_create_requests.sql
-- Description: Create the requests table (parent teaching requests) per specs/parent-request.md.

-- Shared trigger helper (didn't exist yet in 001/002 — needed here for updated_at tracking)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id integer NOT NULL REFERENCES public.subjects(id),
  governorate_id integer NOT NULL REFERENCES public.governorates(id),
  area text NOT NULL,
  student_age integer NOT NULL CHECK (student_age BETWEEN 3 AND 15),
  description text NOT NULL CHECK (char_length(description) >= 50),
  preferred_teacher_gender text CHECK (preferred_teacher_gender IN ('male', 'female', 'any')) DEFAULT 'any',
  preferred_teaching_method text NOT NULL CHECK (preferred_teaching_method IN ('online', 'offline', 'both')),
  budget numeric(10, 2) CHECK (budget IS NULL OR budget > 0),
  status text NOT NULL CHECK (status IN ('open', 'closed', 'cancelled')) DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_requests_status ON public.requests(status);
CREATE INDEX idx_requests_parent_id ON public.requests(parent_id);
CREATE INDEX idx_requests_subject_id ON public.requests(subject_id);
CREATE INDEX idx_requests_governorate_id ON public.requests(governorate_id);

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- RLS
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Public feed shows only open requests; the owning parent can also see their own closed/cancelled ones.
CREATE POLICY "Open requests are viewable by everyone, own requests always visible"
  ON public.requests FOR SELECT
  USING (status = 'open' OR auth.uid() = parent_id);

-- Only a parent can create a request, and only for themselves.
CREATE POLICY "Parents can create their own requests"
  ON public.requests FOR INSERT
  WITH CHECK (
    auth.uid() = parent_id
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- Only the owning parent can edit/cancel their request.
-- NOTE: "cannot edit once an offer is accepted" (per specs/parent-request.md) requires the
-- offers table (Phase 4) to enforce — revisit this policy once that table exists.
CREATE POLICY "Parents can update their own requests"
  ON public.requests FOR UPDATE
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);
