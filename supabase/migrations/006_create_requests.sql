-- Migration: 006_create_requests.sql
-- Description: NAB-30. Parent teaching requests (specs/parent-request.md), rebuilt on the live
-- schema's lookup tables. Replaces _archive/003_create_requests.sql, which was never applied.
-- No contact details live on this table; the public feed only ever sees parent_id.

CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_category_id smallint NOT NULL REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  education_level_id smallint REFERENCES public.education_levels(id) ON DELETE RESTRICT,
  teaching_place_id smallint NOT NULL REFERENCES public.teaching_places(id) ON DELETE RESTRICT,
  governorate_id smallint NOT NULL REFERENCES public.governorates(id) ON DELETE RESTRICT,
  city_id integer REFERENCES public.cities(id) ON DELETE SET NULL,
  area text,
  -- Lower bound follows the youngest education level (nursery, 2 years).
  student_age smallint NOT NULL CHECK (student_age BETWEEN 2 AND 15),
  description text NOT NULL CHECK (char_length(description) >= 50),
  preferred_educator_gender public.educator_gender,  -- NULL = no preference
  budget numeric(10, 2) CHECK (budget IS NULL OR budget > 0),
  pricing_unit_id smallint REFERENCES public.pricing_units(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_needs_pricing_unit CHECK (budget IS NULL OR pricing_unit_id IS NOT NULL)
);

CREATE INDEX idx_requests_status_created ON public.requests (status, created_at DESC);
CREATE INDEX idx_requests_parent ON public.requests (parent_id);
CREATE INDEX idx_requests_service_category ON public.requests (service_category_id);
CREATE INDEX idx_requests_governorate ON public.requests (governorate_id);

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Public feed shows open requests; the owning parent also sees their closed/cancelled ones.
CREATE POLICY "Open requests are public, own requests always visible"
  ON public.requests FOR SELECT
  USING (status = 'open' OR auth.uid() = parent_id);

-- Only parents can create requests, and only for themselves.
CREATE POLICY "Parents can create their own requests"
  ON public.requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = parent_id
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- NOTE: "no edits once an offer is accepted" needs the offers table; revisit then.
CREATE POLICY "Parents can update their own requests"
  ON public.requests FOR UPDATE TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can delete their own requests"
  ON public.requests FOR DELETE TO authenticated
  USING (auth.uid() = parent_id);
