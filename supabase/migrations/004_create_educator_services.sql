-- Migration: 004_create_educator_services.sql
-- Description: Junction table linking teachers (educators) to the subjects/services they offer.
--
-- NOTE: public.teacher_details already has a subjects_taught integer[] column covering the
-- same relationship in denormalized form. This table is the normalized replacement — decide
-- whether to backfill from subjects_taught and drop that column in a follow-up migration once
-- the frontend (services/profile.ts, TeacherProfileForm.tsx) is updated to write here instead.

CREATE TABLE public.educator_services (
  educator_id uuid NOT NULL REFERENCES public.teacher_details(id) ON DELETE CASCADE,
  subject_id integer NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (educator_id, subject_id)
);

CREATE INDEX idx_educator_services_subject_id ON public.educator_services(subject_id);

-- RLS
ALTER TABLE public.educator_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educator services are viewable by everyone"
  ON public.educator_services FOR SELECT
  USING (true);

CREATE POLICY "Educators can manage their own services"
  ON public.educator_services FOR ALL
  USING (auth.uid() = educator_id)
  WITH CHECK (auth.uid() = educator_id);
