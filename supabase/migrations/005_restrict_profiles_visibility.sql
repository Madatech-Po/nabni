-- Migration: 005_restrict_profiles_visibility.sql
-- Description: Close the phone-number privacy gap. The original policy from
-- 001_create_profiles_foundation.sql ("Public profiles are viewable by everyone.")
-- used USING (true), exposing every column — including `phone` — to anyone,
-- contradicting the MVP rule that contact info is only shared after an accepted offer.
--
-- Until the tutor directory and offer-acceptance reveal workflow exist, restrict
-- SELECT to the owning user only. Revisit this (e.g. a public-safe view or
-- column-level policy) when /tutors and the accepted-offer contact reveal are built.

DROP POLICY "Public profiles are viewable by everyone." ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
