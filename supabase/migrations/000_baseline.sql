-- Migration: 000_baseline.sql
-- Description: Snapshot of the live "Nabni Platform" Supabase schema as of 2026-10-14 (NAB-22).
-- The live database is the source of truth; this file reproduces it exactly, including its
-- known defects, which are fixed in the migrations that follow (see 001+).
-- The previous repo migrations were never applied and live in _archive/ for reference.

-- ==========================================
-- Shared trigger helpers
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==========================================
-- Enums
-- ==========================================
CREATE TYPE public.educator_gender AS ENUM ('male', 'female');
CREATE TYPE public.educator_verification_status AS ENUM ('pending', 'approved', 'rejected');

-- ==========================================
-- Lookup tables
-- ==========================================
CREATE TABLE public.governorates (
  id smallint PRIMARY KEY,
  name_ar text NOT NULL UNIQUE,
  name_en text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.governorates IS 'Lookup table containing all Egyptian governorates.';

CREATE TABLE public.cities (
  id integer PRIMARY KEY,
  governorate_id smallint NOT NULL REFERENCES public.governorates(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_city UNIQUE (governorate_id, name_ar)
);
COMMENT ON TABLE public.cities IS 'Lookup table containing Egyptian cities grouped by governorate.';
CREATE INDEX idx_cities_governorate ON public.cities (governorate_id);

CREATE TABLE public.service_categories (
  id smallint PRIMARY KEY,
  name_ar text NOT NULL UNIQUE,
  name_en text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  color varchar,
  image_url text,
  display_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.service_categories IS 'Lookup table containing all educator service categories.';
CREATE INDEX idx_service_categories_display_order ON public.service_categories (display_order);

CREATE TABLE public.education_levels (
  id smallint PRIMARY KEY,
  name_ar text NOT NULL UNIQUE,
  name_en text NOT NULL UNIQUE,
  min_age smallint NOT NULL,
  max_age smallint NOT NULL,
  display_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_age_range CHECK (min_age < max_age)
);
COMMENT ON TABLE public.education_levels IS 'Lookup table containing educational stages and age ranges.';
CREATE INDEX idx_education_levels_display_order ON public.education_levels (display_order);

CREATE TABLE public.teaching_places (
  id smallint PRIMARY KEY,
  name_ar text NOT NULL UNIQUE,
  name_en text NOT NULL UNIQUE,
  icon text,
  display_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.teaching_places IS 'Lookup table containing available teaching locations.';
CREATE INDEX idx_teaching_places_display_order ON public.teaching_places (display_order);

CREATE TABLE public.pricing_units (
  id smallint PRIMARY KEY,
  name_ar text NOT NULL UNIQUE,
  name_en text NOT NULL UNIQUE,
  display_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.pricing_units IS 'Lookup table for educator pricing units.';

CREATE TABLE public.verification_statuses (
  id smallint PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  display_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.verification_statuses IS 'Lookup table for educator verification status.';

-- ==========================================
-- Profiles
-- ==========================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('parent', 'educator', 'admin')),
  full_name text NOT NULL,
  phone text,
  avatar_url text,
  governorate_id uuid,            -- defect: lookup ids are smallint (fixed in 001)
  city text,
  is_active boolean NOT NULL DEFAULT true,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Stores profile information for all Nabni users.';
CREATE INDEX idx_profiles_governorate ON public.profiles (governorate_id);
CREATE INDEX idx_profiles_role ON public.profiles (role);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================
-- Educators
-- ==========================================
CREATE TABLE public.educators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL UNIQUE,
  whatsapp_number text,
  governorate_id uuid,            -- defect: see 001
  city_id uuid,                   -- defect: see 001
  bio text,
  profile_image text,
  experience_years integer DEFAULT 0 CONSTRAINT experience_years_positive CHECK (experience_years >= 0),
  gender public.educator_gender,
  verification_status public.educator_verification_status DEFAULT 'pending',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_educators_city ON public.educators (city_id);
CREATE INDEX idx_educators_governorate ON public.educators (governorate_id);
CREATE INDEX idx_educators_phone ON public.educators (phone);
CREATE INDEX idx_educators_user_id ON public.educators (user_id);

CREATE TRIGGER update_educators_updated_at
  BEFORE UPDATE ON public.educators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.educator_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid NOT NULL REFERENCES public.educators(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,       -- defect: service_categories.id is smallint (fixed in 001)
  created_at timestamptz DEFAULT now(),
  UNIQUE (educator_id, subject_id)
);
CREATE INDEX idx_educator_subjects_educator ON public.educator_subjects (educator_id);
CREATE INDEX idx_educator_subjects_subject ON public.educator_subjects (subject_id);

CREATE TABLE public.educator_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid NOT NULL REFERENCES public.educators(id) ON DELETE CASCADE,
  level_id uuid NOT NULL,         -- defect: education_levels.id is smallint (fixed in 001)
  created_at timestamptz DEFAULT now(),
  UNIQUE (educator_id, level_id)
);
CREATE INDEX idx_educator_levels_educator ON public.educator_levels (educator_id);
CREATE INDEX idx_educator_levels_level ON public.educator_levels (level_id);

CREATE TABLE public.educator_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid NOT NULL REFERENCES public.educators(id) ON DELETE CASCADE,
  governorate_id uuid NOT NULL,   -- defect: see 001
  city_id uuid NOT NULL,          -- defect: see 001
  address text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (educator_id, governorate_id, city_id)
);
CREATE INDEX idx_educator_locations_city ON public.educator_locations (city_id);
CREATE INDEX idx_educator_locations_educator ON public.educator_locations (educator_id);

-- ==========================================
-- Row Level Security
-- ==========================================
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;  -- defect: no policies (fixed in 002)
ALTER TABLE public.educators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educator_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educator_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educator_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Governorates are viewable by everyone" ON public.governorates FOR SELECT USING (true);
CREATE POLICY "Cities are viewable by everyone" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Service categories are viewable by everyone" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Education levels are viewable by everyone" ON public.education_levels FOR SELECT USING (true);
CREATE POLICY "Teaching places are viewable by everyone" ON public.teaching_places FOR SELECT USING (true);
CREATE POLICY "Pricing units are viewable by everyone" ON public.pricing_units FOR SELECT USING (true);
CREATE POLICY "Verification statuses are viewable by everyone" ON public.verification_statuses FOR SELECT USING (true);

CREATE POLICY "Educator manage own profile" ON public.educators
  FOR ALL USING (auth.uid() = user_id);
-- defect: exposes phone / whatsapp_number publicly (fixed in 003)
CREATE POLICY "Public can view approved educators" ON public.educators
  FOR SELECT USING (verification_status = 'approved');

CREATE POLICY "Educator manage own subjects" ON public.educator_subjects
  FOR ALL USING (educator_id IN (SELECT id FROM public.educators WHERE user_id = auth.uid()));
CREATE POLICY "Educator manage own levels" ON public.educator_levels
  FOR ALL USING (educator_id IN (SELECT id FROM public.educators WHERE user_id = auth.uid()));
CREATE POLICY "Educator manage own locations" ON public.educator_locations
  FOR ALL USING (educator_id IN (SELECT id FROM public.educators WHERE user_id = auth.uid()));
