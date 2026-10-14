-- Migration: 001_fix_lookup_foreign_keys.sql
-- Description: NAB-23. Lookup tables use smallint/integer ids, but every column pointing at
-- them was uuid, so no foreign keys could exist. Convert those columns to the matching types,
-- and add the foreign keys.
-- Safe only while the affected tables are empty, which the guard below enforces.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE governorate_id IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.educators)
     OR EXISTS (SELECT 1 FROM public.educator_subjects)
     OR EXISTS (SELECT 1 FROM public.educator_levels)
     OR EXISTS (SELECT 1 FROM public.educator_locations) THEN
    RAISE EXCEPTION 'NAB-23: tables are not empty, write a data-preserving migration instead';
  END IF;
END $$;

-- 1. profiles
ALTER TABLE public.profiles
  ALTER COLUMN governorate_id TYPE smallint USING NULL,
  ADD CONSTRAINT profiles_governorate_id_fkey
    FOREIGN KEY (governorate_id) REFERENCES public.governorates(id) ON DELETE SET NULL;

-- 2. educators
ALTER TABLE public.educators
  ALTER COLUMN governorate_id TYPE smallint USING NULL,
  ALTER COLUMN city_id TYPE integer USING NULL,
  ADD CONSTRAINT educators_governorate_id_fkey
    FOREIGN KEY (governorate_id) REFERENCES public.governorates(id) ON DELETE SET NULL,
  ADD CONSTRAINT educators_city_id_fkey
    FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE SET NULL;

-- 3. educator_subjects -> service_categories
ALTER TABLE public.educator_subjects
  ALTER COLUMN subject_id TYPE smallint USING NULL,
  ADD CONSTRAINT educator_subjects_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.service_categories(id) ON DELETE RESTRICT;

-- 4. educator_levels -> education_levels
ALTER TABLE public.educator_levels
  ALTER COLUMN level_id TYPE smallint USING NULL,
  ADD CONSTRAINT educator_levels_level_id_fkey
    FOREIGN KEY (level_id) REFERENCES public.education_levels(id) ON DELETE RESTRICT;

-- 5. educator_locations: city is optional until the cities lookup is seeded, so a
-- governorate-wide location is allowed; NULLS NOT DISTINCT keeps it unique per educator.
ALTER TABLE public.educator_locations
  DROP CONSTRAINT educator_locations_educator_id_governorate_id_city_id_key,
  ALTER COLUMN governorate_id TYPE smallint USING NULL,
  ALTER COLUMN city_id TYPE integer USING NULL,
  ALTER COLUMN city_id DROP NOT NULL,
  ADD CONSTRAINT educator_locations_governorate_id_fkey
    FOREIGN KEY (governorate_id) REFERENCES public.governorates(id) ON DELETE RESTRICT,
  ADD CONSTRAINT educator_locations_city_id_fkey
    FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT,
  ADD CONSTRAINT educator_locations_educator_id_governorate_id_city_id_key
    UNIQUE NULLS NOT DISTINCT (educator_id, governorate_id, city_id);

CREATE INDEX idx_educator_locations_governorate ON public.educator_locations (governorate_id);
