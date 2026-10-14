-- Migration: 006_drop_subjects_taught_array.sql
-- Description: Complete the normalization started in 004_create_educator_services.sql.
-- The educator<->subject relationship now lives exclusively in educator_services;
-- drop the redundant array column so there is a single source of truth.
-- Frontend updated alongside this migration: src/services/profile.ts and
-- TeacherProfileForm.tsx now write to educator_services instead of this column.

ALTER TABLE public.teacher_details
  DROP COLUMN subjects_taught;
