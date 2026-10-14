-- Migration: 007_remove_duplicate_seed_rows.sql
-- Description: NAB-32. 004_seed_lookups assumed the lookup tables were empty, but they already
-- held seed data from 2026-08-07. Its ON CONFLICT skipped governorates and service categories,
-- but these four tables got duplicate rows next to the originals. Remove them and keep the
-- originals. Nothing references them yet; the FKs (ON DELETE RESTRICT) would abort otherwise.

DELETE FROM public.education_levels
WHERE name_en IN ('Nursery', 'Kindergarten 1', 'Kindergarten 2', 'Primary 1-3', 'Primary 4-6', 'Preparatory');

DELETE FROM public.teaching_places
WHERE name_en IN ('At student''s home', 'At educator''s home', 'At a learning center');

DELETE FROM public.pricing_units
WHERE name_en IN ('Per session', 'Per hour', 'Per month');

-- The original statuses use 'verified' for approved educators; keep that one.
DELETE FROM public.verification_statuses
WHERE code = 'approved';
