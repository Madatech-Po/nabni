-- 1. Create Static Lookups Tables
CREATE TABLE public.governorates (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE public.subjects (
  id serial PRIMARY KEY,
  name text NOT NULL,
  level text NOT NULL,
  UNIQUE(name, level)
);

-- Seed basic data
INSERT INTO public.governorates (name) VALUES 
('القاهرة'), ('الجيزة'), ('الإسكندرية'), ('القليوبية'), ('المنصورة');

INSERT INTO public.subjects (name, level) VALUES 
('لغة عربية', 'تأسيس'), ('رياضيات', 'تأسيس'), ('لغة إنجليزية', 'تأسيس'),
('لغة عربية', 'ابتدائي'), ('رياضيات', 'ابتدائي'), ('لغة إنجليزية', 'ابتدائي');

-- 2. Alter Profiles Table for Parent Requirements
ALTER TABLE public.profiles
ADD COLUMN phone text,
ADD COLUMN governorate_id integer REFERENCES public.governorates(id),
ADD COLUMN area text,
ADD COLUMN is_profile_complete boolean DEFAULT false;

-- 3. Create Teacher Details Table
CREATE TABLE public.teacher_details (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio text,
  years_experience integer,
  teaching_methods text[], -- e.g., ['online', 'offline']
  subjects_taught integer[], -- array of subject IDs
  areas_covered text[]
);

-- 4. Enable RLS and create policies
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_details ENABLE ROW LEVEL SECURITY;

-- Lookups are public read-only
CREATE POLICY "Lookups are viewable by everyone" ON public.governorates FOR SELECT USING (true);
CREATE POLICY "Lookups are viewable by everyone" ON public.subjects FOR SELECT USING (true);

-- Teacher Details Policies
CREATE POLICY "Teacher details are viewable by everyone" ON public.teacher_details FOR SELECT USING (true);

CREATE POLICY "Teachers can insert their own details" ON public.teacher_details FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Teachers can update their own details" ON public.teacher_details FOR UPDATE USING (auth.uid() = id);
