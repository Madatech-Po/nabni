-- Migration: 009_educator_column_grants.sql
-- Description: NAB-33 (CodeRabbit). "Educator manage own profile" is FOR ALL with table-level
-- INSERT/UPDATE, so an educator could set verification_status = 'approved' or is_active on their
-- own row and appear in educator_directory without review. Restrict writes to editable columns;
-- verification_status / is_active are left to admins (service role).

REVOKE INSERT, UPDATE ON public.educators FROM anon, authenticated;

GRANT INSERT (user_id, full_name, phone, whatsapp_number, governorate_id, city_id,
              bio, profile_image, experience_years, gender)
  ON public.educators TO authenticated;

GRANT UPDATE (full_name, phone, whatsapp_number, governorate_id, city_id,
              bio, profile_image, experience_years, gender)
  ON public.educators TO authenticated;
