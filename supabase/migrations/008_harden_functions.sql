-- Migration: 008_harden_functions.sql
-- Description: NAB-29 follow-up from the Supabase security advisors.
-- 1. handle_new_user is a SECURITY DEFINER trigger function; nobody should be able to call it
--    through /rest/v1/rpc.
-- 2. Pin search_path on the updated_at trigger helpers (from the baseline).

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.handle_updated_at() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
