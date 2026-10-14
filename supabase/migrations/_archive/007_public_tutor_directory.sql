-- Migration: 007_public_tutor_directory.sql
-- Description: Unblock the tutor directory (specs/05_tutor_directory.md,
-- specs/search-and-discovery.md) without reopening the phone-number leak that
-- 005_restrict_profiles_visibility.sql closed.
--
-- profiles.SELECT is now owner-only, so a plain join against profiles returns
-- nothing for anonymous visitors. This view exposes only the columns the public
-- directory actually needs (no phone) for approved, active teachers.
--
-- Views are owned by the migration role (postgres), which has BYPASSRLS, and a
-- view without `security_invoker` runs with the owner's privileges by default —
-- so this view bypasses profiles' owner-only RLS policy by design, while the
-- column list itself keeps `phone` out of what it exposes.
CREATE VIEW public.tutor_directory AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.governorate_id,
  g.name AS governorate_name,
  p.area,
  td.bio,
  td.years_experience,
  td.teaching_methods
FROM public.profiles p
JOIN public.teacher_details td ON td.id = p.id
LEFT JOIN public.governorates g ON g.id = p.governorate_id
WHERE p.role = 'teacher'
  AND p.is_approved = true
  AND p.is_active = true;

GRANT SELECT ON public.tutor_directory TO anon, authenticated;
