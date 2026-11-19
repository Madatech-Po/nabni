-- Migration: 025_public_home_stats.sql
-- Description: NAB-123 (Sprint 7, pilot launch). public_home_stats() feeds the counters on the
-- public home page. It returns four aggregate numbers only — no names, ids or contact data:
--   verified_active_educators  educators shown in educator_directory (verified AND is_active)
--   open_requests              requests in the public feed (status 'open' AND the parent's
--                              account is active, as in the requests SELECT policy, 013)
--   governorates_covered       distinct governorates of those verified educators: their home
--                              governorate plus the governorates they serve (educator_locations)
--   accepted_offers_total      accepted offers (matches)
--
-- Test data is left out the same way as admin_pilot_stats() (024): rows owned by e2e accounts
-- (auth email tagged "+e2e-", via e2e_account_ids()) and rows whose text starts with "[E2E]"
-- (educators.full_name, requests.description, offers.notes); offers on excluded requests or by
-- excluded educators are not counted.
--
-- Access: callable by anon and authenticated. SECURITY DEFINER (search_path = '') because anon
-- cannot read educators / offers directly; it only ever returns the counts above.

CREATE OR REPLACE FUNCTION public.public_home_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH e2e AS (
    SELECT id FROM public.e2e_account_ids() AS id
  ),
  edu AS (
    SELECT e.id, e.governorate_id
    FROM public.educators e
    WHERE e.verification_status = 'verified'
      AND e.is_active
      AND e.user_id NOT IN (SELECT id FROM e2e)
      AND COALESCE(e.full_name, '') NOT LIKE '[E2E]%'
  ),
  req AS (
    SELECT r.id, r.status, r.parent_id
    FROM public.requests r
    WHERE r.parent_id NOT IN (SELECT id FROM e2e)
      AND COALESCE(r.description, '') NOT LIKE '[E2E]%'
  )
  SELECT jsonb_build_object(
    'verified_active_educators', (SELECT count(*) FROM edu),
    'open_requests', (SELECT count(*) FROM req
                      WHERE status = 'open' AND public.is_profile_active(parent_id)),
    'governorates_covered', (SELECT count(DISTINCT g) FROM (
        SELECT governorate_id AS g FROM edu
        UNION
        SELECT lo.governorate_id FROM public.educator_locations lo JOIN edu ON edu.id = lo.educator_id
      ) govs WHERE g IS NOT NULL),
    'accepted_offers_total', (SELECT count(*)
      FROM public.offers o
      JOIN req ON req.id = o.request_id
      JOIN public.educators e ON e.id = o.educator_id
      WHERE o.status = 'accepted'
        AND e.user_id NOT IN (SELECT id FROM e2e)
        AND COALESCE(e.full_name, '') NOT LIKE '[E2E]%'
        AND COALESCE(o.notes, '') NOT LIKE '[E2E]%')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.public_home_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_home_stats() TO anon, authenticated;
