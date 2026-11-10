-- Migration: 021_admin_notifications.sql
-- Description: NAB-111 (epic NAB-105). Admins get an in-app notification (via notify(), 018)
-- for educators waiting for review, and a rejected educator goes back to review on their own
-- when they edit their profile (product decision recorded on NAB-111: automatic re-review).
--
-- Recipients: every active admin (profiles.role = 'admin' AND is_active, the same rule as
-- is_admin()), through notify_admins().
--
-- Events:
--   * New educator profile (INSERT into educators, pending by default):
--     admin.educator_pending -> /admin/educators.
--   * A REJECTED educator edits their profile:
--       - BEFORE UPDATE on educators: if the row is rejected, stays rejected in this UPDATE (so it is
--         not an admin decision through set_educator_verification), the editor is the educator
--         themselves (auth.uid() = user_id; service-role maintenance does not count) and at least
--         one educator-editable column (the 009 UPDATE grant) really changed, the row goes back to
--         'pending' and the stored verification_reason is cleared. A no-op UPDATE changes nothing.
--       - Subjects / levels / locations: updateEducatorProfile() always UPDATEs the educators row,
--         but with the same values when only these lists changed, so the row trigger alone would
--         miss that edit. The profile form saves them by deleting and re-inserting the rows, so
--         AFTER INSERT/UPDATE/DELETE triggers on educator_subjects / educator_levels /
--         educator_locations send a rejected educator back to pending as well (same actor rule).
--         Consequence: any save of the profile form by a rejected educator that has at least one
--         subject/level/location counts as a resubmission, even with nothing changed. That is
--         the intended product behaviour (saving = asking for review again).
--       - AFTER UPDATE on educators: rejected -> pending done by the educator themselves sends
--         admin.educator_resubmitted -> /admin/educators?status=pending, once per active admin.
--         An admin moving an educator rejected -> pending via set_educator_verification() is an
--         admin decision and sends nothing.
--     The educator gets nothing for the automatic -> pending (019 sends nothing for -> pending).
--   * Admin decisions, and edits by pending / verified / suspended educators, are untouched.
--   * The educator still cannot set verification_status / verification_reason / is_active
--     themselves: the 009 column grants are unchanged; only these triggers (running as the
--     owner) change the status.
--
-- All functions are SECURITY DEFINER with search_path = '' and not executable by clients.

-- ---------- Helper: one notification per active admin ----------

CREATE OR REPLACE FUNCTION public.notify_admins(
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_id uuid;
  n integer := 0;
BEGIN
  FOR admin_id IN
    SELECT id FROM public.profiles WHERE role = 'admin' AND is_active
  LOOP
    PERFORM public.notify(admin_id, p_type, p_title, p_body, p_link, p_data);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- ---------- New educator profile ----------

CREATE OR REPLACE FUNCTION public.notify_admins_educator_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.verification_status = 'pending' THEN
    PERFORM public.notify_admins(
      'admin.educator_pending',
      'ملف متخصص جديد بانتظار المراجعة',
      'أضاف ' || COALESCE(NULLIF(trim(NEW.full_name), ''), 'متخصص') || ' ملفه ويحتاج للمراجعة والتوثيق.',
      '/admin/educators',
      jsonb_build_object('educator_id', NEW.id));
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_admins_educator_created() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_admins_on_educator_created ON public.educators;
CREATE TRIGGER notify_admins_on_educator_created
  AFTER INSERT ON public.educators
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_educator_created();

-- ---------- Rejected educator edits the educators row -> back to pending ----------

CREATE OR REPLACE FUNCTION public.educator_back_to_review_on_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.verification_status = 'rejected'
     AND NEW.verification_status = 'rejected'
     AND auth.uid() IS NOT NULL
     AND auth.uid() = OLD.user_id
     AND (NEW.full_name, NEW.phone, NEW.whatsapp_number, NEW.governorate_id, NEW.city_id,
          NEW.bio, NEW.profile_image, NEW.experience_years, NEW.gender)
         IS DISTINCT FROM
         (OLD.full_name, OLD.phone, OLD.whatsapp_number, OLD.governorate_id, OLD.city_id,
          OLD.bio, OLD.profile_image, OLD.experience_years, OLD.gender)
  THEN
    NEW.verification_status := 'pending';
    NEW.verification_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.educator_back_to_review_on_edit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS educator_back_to_review_on_edit ON public.educators;
CREATE TRIGGER educator_back_to_review_on_edit
  BEFORE UPDATE ON public.educators
  FOR EACH ROW
  WHEN (OLD.verification_status = 'rejected')
  EXECUTE FUNCTION public.educator_back_to_review_on_edit();

-- ---------- Rejected educator edits subjects / levels / locations -> back to pending ----------

CREATE OR REPLACE FUNCTION public.educator_back_to_review_on_list_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.educator_id ELSE NEW.educator_id END;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Matches nothing once the educator is no longer rejected, so a save that rewrites many
  -- rows flips (and notifies) only once. While the educators row itself is being deleted
  -- (ON DELETE CASCADE) it is no longer visible here, so this is a no-op too.
  UPDATE public.educators
  SET verification_status = 'pending',
      verification_reason = NULL
  WHERE id = target
    AND verification_status = 'rejected'
    AND user_id = auth.uid();

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.educator_back_to_review_on_list_edit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS educator_back_to_review_on_subjects_edit ON public.educator_subjects;
CREATE TRIGGER educator_back_to_review_on_subjects_edit
  AFTER INSERT OR UPDATE OR DELETE ON public.educator_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.educator_back_to_review_on_list_edit();

DROP TRIGGER IF EXISTS educator_back_to_review_on_levels_edit ON public.educator_levels;
CREATE TRIGGER educator_back_to_review_on_levels_edit
  AFTER INSERT OR UPDATE OR DELETE ON public.educator_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.educator_back_to_review_on_list_edit();

DROP TRIGGER IF EXISTS educator_back_to_review_on_locations_edit ON public.educator_locations;
CREATE TRIGGER educator_back_to_review_on_locations_edit
  AFTER INSERT OR UPDATE OR DELETE ON public.educator_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.educator_back_to_review_on_list_edit();

-- ---------- Notify admins of the resubmission ----------

CREATE OR REPLACE FUNCTION public.notify_admins_educator_resubmitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only the educator's own edit (the triggers above); an admin choosing 'pending' is a decision.
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
    PERFORM public.notify_admins(
      'admin.educator_resubmitted',
      'عدّل متخصص مرفوض ملفه ويحتاج لإعادة المراجعة',
      'عدّل ' || COALESCE(NULLIF(trim(NEW.full_name), ''), 'متخصص') || ' ملفه بعد رفضه، وعاد إلى قائمة المراجعة.',
      '/admin/educators?status=pending',
      jsonb_build_object('educator_id', NEW.id));
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_admins_educator_resubmitted() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_admins_on_educator_resubmitted ON public.educators;
-- Plain AFTER UPDATE, not "UPDATE OF verification_status": a column-specific trigger looks only
-- at the UPDATE's SET list, and the educator's UPDATE sets bio etc. while the status is changed
-- by the BEFORE trigger above. The WHEN clause keeps it to real rejected -> pending changes.
CREATE TRIGGER notify_admins_on_educator_resubmitted
  AFTER UPDATE ON public.educators
  FOR EACH ROW
  WHEN (OLD.verification_status = 'rejected' AND NEW.verification_status = 'pending')
  EXECUTE FUNCTION public.notify_admins_educator_resubmitted();
