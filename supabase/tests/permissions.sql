-- Database permission tests (NAB-48).
--
-- Exercises RLS, column grants and the admin functions as an anonymous visitor, a parent,
-- an educator and an admin, using throwaway fixture users created inside the transaction.
-- Everything is rolled back at the end, so it is safe to run against the live project:
--   * Supabase MCP / SQL editor: run the whole file.
--   * psql: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/permissions.sql
-- Any broken expectation raises "FAIL: <check>" and stops the run.

BEGIN;

CREATE FUNCTION pg_temp.check(ok boolean, label text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: %', label;
  END IF;
  RAISE NOTICE 'ok - %', label;
END;
$$;

-- Runs `sql` and reports whether Postgres refused it for lack of privileges (RLS WITH CHECK
-- violations and missing grants both raise insufficient_privilege).
CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END;
$$;

CREATE FUNCTION pg_temp.act_as(uid uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  RESET ROLE;
  IF uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    SET LOCAL ROLE anon;
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION pg_temp.check(boolean, text), pg_temp.denied(text), pg_temp.act_as(uuid)
  TO anon, authenticated;

DO $$
DECLARE
  parent_uid   uuid := gen_random_uuid();
  educator_uid uuid := gen_random_uuid();
  admin_uid    uuid := gen_random_uuid();
  edu_id       uuid;
  req_id       uuid;
  service_id   smallint := (SELECT min(id) FROM public.service_categories);
  level_id     smallint := (SELECT min(id) FROM public.education_levels);
  place_id     smallint := (SELECT min(id) FROM public.teaching_places);
  gov_id       smallint := (SELECT min(id) FROM public.governorates);
  unit_id      smallint := (SELECT min(id) FROM public.pricing_units);
  n            int;
BEGIN
  -- ---------- Fixtures: signups go through handle_new_user ----------
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
    (parent_uid,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-parent@example.invalid',
     '{"full_name":"Test Parent","role":"parent"}', now(), now()),
    (educator_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-educator@example.invalid',
     '{"first_name":"Test","last_name":"Educator","role":"teacher"}', now(), now()),
    (admin_uid,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-admin@example.invalid',
     '{"full_name":"Test Admin","role":"admin"}', now(), now());

  PERFORM pg_temp.check((SELECT role FROM public.profiles WHERE id = parent_uid) = 'parent', 'signup creates a parent profile');
  PERFORM pg_temp.check((SELECT role FROM public.profiles WHERE id = educator_uid) = 'educator', 'legacy "teacher" signup becomes educator');
  PERFORM pg_temp.check((SELECT full_name FROM public.profiles WHERE id = educator_uid) = 'Test Educator', 'full name built from first + last name');
  PERFORM pg_temp.check((SELECT role FROM public.profiles WHERE id = admin_uid) = 'parent', 'nobody can sign up as admin');

  UPDATE public.profiles SET role = 'admin' WHERE id = admin_uid;  -- what an operator would do

  -- ---------- Educator ----------
  PERFORM pg_temp.act_as(educator_uid);
  INSERT INTO public.educators (user_id, full_name, phone, governorate_id, bio, experience_years, gender)
    VALUES (educator_uid, 'Test Educator', '01099990000', gov_id, 'bio', 3, 'female')
    RETURNING id INTO edu_id;
  INSERT INTO public.educator_subjects (educator_id, subject_id) VALUES (edu_id, service_id);
  INSERT INTO public.educator_levels (educator_id, level_id) VALUES (edu_id, level_id);
  INSERT INTO public.educator_locations (educator_id, governorate_id) VALUES (edu_id, gov_id);
  PERFORM pg_temp.check(true, 'educator saves profile, services, levels and locations');

  UPDATE public.educators SET bio = 'updated' WHERE id = edu_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.check(n = 1, 'educator edits own editable fields');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.educators SET verification_status = 'verified' WHERE id = %L$q$, edu_id)),
    'educator cannot self-verify via the table');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.educators SET is_active = false WHERE id = %L$q$, edu_id)),
    'educator cannot change is_active');
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.set_educator_verification(%L, 'verified')$q$, edu_id)),
    'educator cannot call set_educator_verification');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.profiles SET role = 'admin' WHERE id = %L$q$, educator_uid)),
    'educator cannot change own role');
  PERFORM pg_temp.check(pg_temp.denied(format(
    $q$INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
       VALUES (%L, %s, %s, %s, 6, repeat('x', 60))$q$, educator_uid, service_id, place_id, gov_id)),
    'educator cannot create a request');
  UPDATE public.profiles SET full_name = 'hijack' WHERE id = parent_uid;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.check(n = 0, 'educator cannot edit another profile');

  -- ---------- Parent ----------
  PERFORM pg_temp.act_as(parent_uid);
  SELECT count(*) INTO n FROM public.profiles;
  PERFORM pg_temp.check(n = 1, 'parent sees only their own profile');
  SELECT count(*) INTO n FROM public.educators;
  PERFORM pg_temp.check(n = 0, 'parent cannot read the educators table (pending educator)');
  INSERT INTO public.requests (parent_id, service_category_id, education_level_id, teaching_place_id, governorate_id,
                               student_age, description, budget, pricing_unit_id)
    VALUES (parent_uid, service_id, level_id, place_id, gov_id, 5, repeat('ت', 60), 150, unit_id)
    RETURNING id INTO req_id;
  PERFORM pg_temp.check(true, 'parent creates a request');
  UPDATE public.requests SET status = 'closed' WHERE id = req_id;
  UPDATE public.requests SET status = 'open' WHERE id = req_id;
  PERFORM pg_temp.check(true, 'parent closes and reopens own request');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.requests SET status = 'removed' WHERE id = %L$q$, req_id)),
    'parent cannot mark own request removed');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.requests SET parent_id = %L WHERE id = %L$q$, educator_uid, req_id)),
    'parent cannot move a request to another owner');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.profiles SET is_active = true WHERE id = %L$q$, parent_uid)),
    'parent cannot change own is_active');
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.set_profile_active(%L, false)$q$, parent_uid)),
    'parent cannot call set_profile_active');
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.set_request_status(%L, 'removed')$q$, req_id)),
    'parent cannot call set_request_status');
  PERFORM pg_temp.check(pg_temp.denied(format(
    $q$INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
       VALUES (%L, %s, %s, %s, 6, repeat('x', 60))$q$, educator_uid, service_id, place_id, gov_id)),
    'parent cannot post a request as someone else');
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.set_educator_verification(%L, 'verified')$q$, edu_id)),
    'parent cannot call set_educator_verification');
  SELECT count(*) INTO n FROM public.admin_logs;
  PERFORM pg_temp.check(n = 0, 'parent cannot read admin_logs');

  -- ---------- Anonymous visitor ----------
  PERFORM pg_temp.act_as(NULL);
  SELECT count(*) INTO n FROM public.profiles;
  PERFORM pg_temp.check(n = 0, 'anon cannot read profiles');
  SELECT count(*) INTO n FROM public.educators;
  PERFORM pg_temp.check(n = 0, 'anon cannot read the educators table');
  SELECT count(*) INTO n FROM public.educator_directory WHERE id = edu_id;
  PERFORM pg_temp.check(n = 0, 'pending educator is not in the public directory');
  SELECT count(*) INTO n FROM public.requests WHERE parent_id = parent_uid AND status = 'open';
  PERFORM pg_temp.check(n = 1, 'anon sees open requests');
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.set_educator_verification(%L, 'verified')$q$, edu_id)),
    'anon cannot call set_educator_verification');
  PERFORM pg_temp.check(pg_temp.denied('SELECT public.is_admin()'), 'anon cannot call is_admin');

  -- ---------- Admin ----------
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM pg_temp.check(public.is_admin(), 'is_admin() is true for an admin');
  SELECT count(*) INTO n FROM public.educators WHERE id = edu_id AND phone IS NOT NULL;
  PERFORM pg_temp.check(n = 1, 'admin reads pending educators with contact details');
  SELECT count(*) INTO n FROM public.educator_subjects WHERE educator_id = edu_id;
  PERFORM pg_temp.check(n = 1, 'admin reads educator services');

  PERFORM public.set_educator_verification(edu_id, 'rejected', 'missing documents');
  PERFORM public.set_educator_verification(edu_id, 'verified');
  PERFORM public.set_educator_verification(edu_id, 'verified');  -- no-op, must not be logged
  SELECT count(*) INTO n FROM public.admin_logs WHERE target_id = edu_id;
  PERFORM pg_temp.check(n = 2, 'each real status change is logged once');
  PERFORM pg_temp.check(
    (SELECT details->>'reason' FROM public.admin_logs WHERE target_id = edu_id ORDER BY id LIMIT 1) = 'missing documents',
    'the reason is stored in admin_logs');
  PERFORM pg_temp.check(pg_temp.denied(format(
    $q$INSERT INTO public.admin_logs (admin_id, action, target_type) VALUES (%L, 'fake', 'x')$q$, admin_uid)),
    'nobody writes admin_logs directly');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.educators SET verification_status = 'suspended' WHERE id = %L$q$, edu_id)),
    'even admins change status only through the function');

  -- ---------- Public directory after verification ----------
  PERFORM pg_temp.act_as(NULL);
  SELECT count(*) INTO n FROM public.educator_directory WHERE id = edu_id AND service_id = ANY (subject_ids);
  PERFORM pg_temp.check(n = 1, 'verified educator appears in the directory with services');
  PERFORM pg_temp.check(NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'educator_directory'
        AND column_name IN ('phone', 'whatsapp_number', 'user_id')),
    'directory exposes no contact details');

  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu_id, 'suspended', 'complaint');
  PERFORM pg_temp.act_as(NULL);
  SELECT count(*) INTO n FROM public.educator_directory WHERE id = edu_id;
  PERFORM pg_temp.check(n = 0, 'suspended educator leaves the directory');

  -- ---------- Admin: accounts and request moderation (NAB-51) ----------
  PERFORM pg_temp.act_as(admin_uid);
  SELECT count(*) INTO n FROM public.profiles WHERE id IN (parent_uid, educator_uid, admin_uid);
  PERFORM pg_temp.check(n = 3, 'admin reads all profiles');
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.set_profile_active(%L, false)$q$, educator_uid)),
    'set_profile_active refuses educator accounts');
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.set_profile_active(%L, false)$q$, admin_uid)),
    'set_profile_active refuses admin accounts (no self lock-out)');
  BEGIN
    PERFORM public.set_request_status(req_id, 'archived');
    PERFORM pg_temp.check(false, 'set_request_status rejects unknown statuses');
  EXCEPTION WHEN invalid_parameter_value THEN
    PERFORM pg_temp.check(true, 'set_request_status rejects unknown statuses');
  END;

  -- Suspension hides the parent's open requests and blocks their writes.
  PERFORM public.set_profile_active(parent_uid, false, 'spam');
  PERFORM public.set_profile_active(parent_uid, false);  -- no-op, not logged
  PERFORM pg_temp.act_as(NULL);
  SELECT count(*) INTO n FROM public.requests WHERE id = req_id;
  PERFORM pg_temp.check(n = 0, 'open requests of a suspended parent leave the public feed');
  PERFORM pg_temp.act_as(parent_uid);
  PERFORM pg_temp.check(pg_temp.denied(format(
    $q$INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
       VALUES (%L, %s, %s, %s, 6, repeat('x', 60))$q$, parent_uid, service_id, place_id, gov_id)),
    'suspended parent cannot create a request');
  UPDATE public.requests SET description = repeat('y', 60) WHERE id = req_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.check(n = 0, 'suspended parent cannot edit a request');
  SELECT count(*) INTO n FROM public.requests WHERE id = req_id;
  PERFORM pg_temp.check(n = 1, 'suspended parent still sees own requests');

  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_profile_active(parent_uid, true);
  SELECT count(*) INTO n FROM public.admin_logs WHERE target_id = parent_uid AND action = 'profile.active_changed';
  PERFORM pg_temp.check(n = 2, 'suspend + reactivate logged once each');
  PERFORM pg_temp.check(
    (SELECT details->>'reason' FROM public.admin_logs WHERE target_id = parent_uid ORDER BY id LIMIT 1) = 'spam',
    'suspension reason stored');

  -- Removing a request hides it from the public and locks it for the owner.
  PERFORM public.set_request_status(req_id, 'removed', 'offensive');
  SELECT count(*) INTO n FROM public.admin_logs WHERE target_id = req_id AND action = 'request.status_changed';
  PERFORM pg_temp.check(n = 1, 'request removal logged');
  SELECT count(*) INTO n FROM public.requests WHERE id = req_id;
  PERFORM pg_temp.check(n = 1, 'admin still reads removed requests');
  PERFORM pg_temp.act_as(NULL);
  SELECT count(*) INTO n FROM public.requests WHERE id = req_id;
  PERFORM pg_temp.check(n = 0, 'removed request is not public');
  PERFORM pg_temp.act_as(parent_uid);
  PERFORM pg_temp.check((SELECT status FROM public.requests WHERE id = req_id) = 'removed', 'owner sees the request as removed');
  UPDATE public.requests SET status = 'open' WHERE id = req_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.check(n = 0, 'owner cannot reopen a removed request');
  DELETE FROM public.requests WHERE id = req_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.check(n = 0, 'owner cannot delete a removed request');

  RESET ROLE;
  RAISE NOTICE 'All permission checks passed.';
END $$;

ROLLBACK;
