-- Migration: 011_admin_helpers_and_logs.sql
-- Description: NAB-38. Audit log for admin actions (specs/admin-dashboard.md: "Administrative
-- actions are logged in an admin_logs table"), plus the is_admin() helper the admin policies
-- and functions rely on.

-- SECURITY DEFINER so policies can call it without recursing into profiles' own RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE TABLE public.admin_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_logs IS
  'Audit trail of admin actions. Written only by admin SECURITY DEFINER functions (NAB-38).';

CREATE INDEX idx_admin_logs_target ON public.admin_logs (target_type, target_id, created_at DESC);
CREATE INDEX idx_admin_logs_admin ON public.admin_logs (admin_id, created_at DESC);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read the log; nobody can write it directly (no INSERT/UPDATE/DELETE policies).
CREATE POLICY "Admins can read admin logs"
  ON public.admin_logs FOR SELECT TO authenticated
  USING (public.is_admin());
