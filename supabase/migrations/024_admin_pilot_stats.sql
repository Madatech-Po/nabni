-- Migration: 024_admin_pilot_stats.sql
-- Description: NAB-125 (Sprint 7, pilot launch). admin_pilot_stats() gives the admin dashboard
-- the pilot numbers in one call, with test data left out.
--
-- Who is left out:
--   * e2e accounts: the Playwright accounts sign up with plus-addressed emails tagged
--     "+e2e-<role>" (…+e2e-parent@…, …+e2e-educator@…, …+e2e-admin@…). They are identified by
--     auth.users.email LIKE '%+e2e-%@%' through e2e_account_ids(). The email is used rather
--     than the "[E2E]" display name because users can edit their name freely, while the email
--     is fixed by the e2e setup. A real user would have to choose a "+e2e-" tag themselves to
--     be dropped.
--   * Rows marked by the e2e helpers: requests whose description starts with "[E2E]",
--     educator profiles whose full_name starts with "[E2E]", offers whose notes start with
--     "[E2E]" — plus every row owned by an e2e account, and offers on excluded requests.
--   * Admins (profiles.role = 'admin') are not counted as parents / educators.
--
-- Shape (jsonb):
--   parents, educators                 {total, last_7_days}  (accounts, by profiles.created_at)
--   educators_by_status                {pending, verified, rejected, suspended}  (educator profiles)
--   requests                           {posted: {total, last_7_days}, open, closed, cancelled, removed}
--   offers                             {sent: {total, last_7_days}, pending, accepted, declined,
--                                       withdrawn, archived, removed}
--   avg_offers_per_request             over requests with >= 1 offer (null when none)
--   median_hours_to_first_offer        request created -> its first offer (null when none)
--   matches                            {total, last_7_days} = accepted offers; last_7_days uses
--                                       offers.updated_at as the acceptance time (an accepted
--                                       offer does not change again)
--   generated_at
--
-- Access: SECURITY DEFINER, search_path = ''; raises insufficient_privilege unless is_admin().
-- EXECUTE for authenticated only. e2e_account_ids() is not executable by clients.

-- ---------- Helper: the e2e test accounts ----------

CREATE OR REPLACE FUNCTION public.e2e_account_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE email LIKE '%+e2e-%@%';
$$;

REVOKE EXECUTE ON FUNCTION public.e2e_account_ids() FROM PUBLIC, anon, authenticated;

-- ---------- Admin pilot stats ----------

CREATE OR REPLACE FUNCTION public.admin_pilot_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  week_ago timestamptz := now() - interval '7 days';
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can read pilot stats' USING ERRCODE = 'insufficient_privilege';
  END IF;

  WITH e2e AS (
    SELECT id FROM public.e2e_account_ids() AS id
  ),
  people AS (
    SELECT p.role, p.created_at
    FROM public.profiles p
    WHERE p.role IN ('parent', 'educator')
      AND p.id NOT IN (SELECT id FROM e2e)
  ),
  edu AS (
    SELECT e.id, e.verification_status
    FROM public.educators e
    JOIN public.profiles p ON p.id = e.user_id
    WHERE p.role <> 'admin'
      AND e.user_id NOT IN (SELECT id FROM e2e)
      AND COALESCE(e.full_name, '') NOT LIKE '[E2E]%'
  ),
  req AS (
    SELECT r.id, r.status, r.created_at
    FROM public.requests r
    WHERE r.parent_id NOT IN (SELECT id FROM e2e)
      AND COALESCE(r.description, '') NOT LIKE '[E2E]%'
  ),
  off AS (
    SELECT o.id, o.request_id, o.status, o.created_at, o.updated_at
    FROM public.offers o
    JOIN req ON req.id = o.request_id
    JOIN public.educators e ON e.id = o.educator_id
    WHERE e.user_id NOT IN (SELECT id FROM e2e)
      AND COALESCE(e.full_name, '') NOT LIKE '[E2E]%'
      AND COALESCE(o.notes, '') NOT LIKE '[E2E]%'
  ),
  per_request AS (
    SELECT req.id, req.created_at, count(*) AS offers_n, min(off.created_at) AS first_offer_at
    FROM req JOIN off ON off.request_id = req.id
    GROUP BY req.id, req.created_at
  )
  SELECT jsonb_build_object(
    'parents', (SELECT jsonb_build_object(
        'total', count(*),
        'last_7_days', count(*) FILTER (WHERE created_at >= week_ago))
      FROM people WHERE role = 'parent'),
    'educators', (SELECT jsonb_build_object(
        'total', count(*),
        'last_7_days', count(*) FILTER (WHERE created_at >= week_ago))
      FROM people WHERE role = 'educator'),
    'educators_by_status', (SELECT jsonb_build_object(
        'pending',   count(*) FILTER (WHERE verification_status = 'pending'),
        'verified',  count(*) FILTER (WHERE verification_status = 'verified'),
        'rejected',  count(*) FILTER (WHERE verification_status = 'rejected'),
        'suspended', count(*) FILTER (WHERE verification_status = 'suspended'))
      FROM edu),
    'requests', (SELECT jsonb_build_object(
        'posted', jsonb_build_object(
          'total', count(*),
          'last_7_days', count(*) FILTER (WHERE created_at >= week_ago)),
        'open',      count(*) FILTER (WHERE status = 'open'),
        'closed',    count(*) FILTER (WHERE status = 'closed'),
        'cancelled', count(*) FILTER (WHERE status = 'cancelled'),
        'removed',   count(*) FILTER (WHERE status = 'removed'))
      FROM req),
    'offers', (SELECT jsonb_build_object(
        'sent', jsonb_build_object(
          'total', count(*),
          'last_7_days', count(*) FILTER (WHERE created_at >= week_ago)),
        'pending',   count(*) FILTER (WHERE status = 'pending'),
        'accepted',  count(*) FILTER (WHERE status = 'accepted'),
        'declined',  count(*) FILTER (WHERE status = 'declined'),
        'withdrawn', count(*) FILTER (WHERE status = 'withdrawn'),
        'archived',  count(*) FILTER (WHERE status = 'archived'),
        'removed',   count(*) FILTER (WHERE status = 'removed'))
      FROM off),
    'avg_offers_per_request', (SELECT round(avg(offers_n), 2) FROM per_request),
    'median_hours_to_first_offer', (SELECT round((percentile_cont(0.5) WITHIN GROUP (
        ORDER BY extract(epoch FROM first_offer_at - created_at) / 3600))::numeric, 1)
      FROM per_request),
    'matches', (SELECT jsonb_build_object(
        'total', count(*),
        'last_7_days', count(*) FILTER (WHERE updated_at >= week_ago))
      FROM off WHERE status = 'accepted'),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_pilot_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_pilot_stats() TO authenticated;
