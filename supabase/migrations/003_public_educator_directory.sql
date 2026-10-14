-- Migration: 003_public_educator_directory.sql
-- Description: NAB-25. The "Public can view approved educators" policy exposed every column of
-- educators, including phone and whatsapp_number, to anonymous users. Contact details must
-- only be shared after an accepted offer.
--
-- Replace it with a view exposing only the directory columns for approved, active educators,
-- with their subjects, levels and governorates aggregated so the directory can filter without
-- public access to the junction tables.
--
-- The view runs with its owner's privileges (no security_invoker), so it reads past the
-- owner-only RLS on educators by design; its column list is what keeps contact data private.

DROP POLICY "Public can view approved educators" ON public.educators;

CREATE VIEW public.educator_directory AS
SELECT
  e.id,
  e.full_name,
  e.bio,
  e.profile_image,
  e.experience_years,
  e.gender,
  e.governorate_id,
  g.name_ar AS governorate_name_ar,
  e.city_id,
  c.name_ar AS city_name_ar,
  COALESCE((SELECT array_agg(es.subject_id ORDER BY es.subject_id)
            FROM public.educator_subjects es WHERE es.educator_id = e.id), '{}') AS subject_ids,
  COALESCE((SELECT array_agg(el.level_id ORDER BY el.level_id)
            FROM public.educator_levels el WHERE el.educator_id = e.id), '{}') AS level_ids,
  COALESCE((SELECT array_agg(DISTINCT lo.governorate_id)
            FROM public.educator_locations lo WHERE lo.educator_id = e.id), '{}') AS location_governorate_ids,
  e.created_at
FROM public.educators e
LEFT JOIN public.governorates g ON g.id = e.governorate_id
LEFT JOIN public.cities c ON c.id = e.city_id
WHERE e.verification_status = 'approved'
  AND e.is_active = true;

COMMENT ON VIEW public.educator_directory IS
  'Public educator directory: approved, active educators without contact details (NAB-25).';

GRANT SELECT ON public.educator_directory TO anon, authenticated;
