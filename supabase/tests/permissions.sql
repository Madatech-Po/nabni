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

-- Runs `sql` and reports whether it failed with the given SQLSTATE (e.g. '23505').
CREATE FUNCTION pg_temp.fails_with(sql text, state text) RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE = state;
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

GRANT EXECUTE ON FUNCTION pg_temp.check(boolean, text), pg_temp.denied(text), pg_temp.act_as(uuid),
  pg_temp.fails_with(text, text)
  TO anon, authenticated;

DO $$
DECLARE
  parent_uid   uuid := gen_random_uuid();
  educator_uid uuid := gen_random_uuid();
  admin_uid    uuid := gen_random_uuid();
  edu_id       uuid;
  req_id       uuid;
  educator2_uid uuid := gen_random_uuid();
  edu2_id      uuid;
  req2_id      uuid;
  req3_id      uuid;
  offer1_id    uuid;
  offer2_id    uuid;
  offer3_id    uuid;
  service_id   smallint := (SELECT min(id) FROM public.service_categories);
  level_id     smallint := (SELECT min(id) FROM public.education_levels);
  place_id     smallint := (SELECT min(id) FROM public.teaching_places);
  gov_id       smallint := (SELECT min(id) FROM public.governorates);
  unit_id      smallint := (SELECT min(id) FROM public.pricing_units);
  n            int;
  notif_p1     uuid;
  notif_p2     uuid;
  notif_e1     uuid;
  req4_id      uuid;
  req5_id      uuid;
  offer4_id    uuid;
  offer5_id    uuid;
  offer6_id    uuid;
  offer7_id    uuid;
  offer8_id    uuid;
  nt           public.notifications%ROWTYPE;
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

  -- ---------- Offers (NAB-80) ----------
  RESET ROLE;
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
    (educator2_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-educator2@example.invalid',
     '{"full_name":"Second Educator","role":"educator"}', now(), now());
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu_id, 'verified');
  PERFORM pg_temp.act_as(educator2_uid);
  INSERT INTO public.educators (user_id, full_name, phone, governorate_id, gender)
    VALUES (educator2_uid, 'Second Educator', '01188880000', gov_id, 'male') RETURNING id INTO edu2_id;
  PERFORM pg_temp.act_as(parent_uid);
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (parent_uid, service_id, place_id, gov_id, 6, repeat('ع', 60)) RETURNING id INTO req2_id;

  -- Who may offer
  PERFORM pg_temp.act_as(educator2_uid);
  PERFORM pg_temp.check(pg_temp.denied(format($q$INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule) VALUES (%L, %L, 100, %s, 'Any day')$q$, req2_id, edu2_id, unit_id)),
    'unverified educator cannot offer');
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu2_id, 'verified');

  PERFORM pg_temp.act_as(educator_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule, notes)
    VALUES (req2_id, edu_id, 200, unit_id, 'Sat and Tue evenings', 'note') RETURNING id INTO offer1_id;
  PERFORM pg_temp.check(true, 'verified educator offers on an open request');
  PERFORM pg_temp.check(pg_temp.fails_with(format($q$INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule) VALUES (%L, %L, 100, %s, 'Any day')$q$, req2_id, edu_id, unit_id), '23505'),
    'one active offer per educator per request');
  PERFORM pg_temp.check(pg_temp.denied(format($q$INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule) VALUES (%L, %L, 100, %s, 'Any day')$q$, req2_id, edu2_id, unit_id)),
    'educator cannot offer in another educator name');
  PERFORM pg_temp.check(pg_temp.denied(format($q$INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule) VALUES (%L, %L, 100, %s, 'Any day')$q$, req_id, edu_id, unit_id)),
    'no offers on a removed request');
  PERFORM pg_temp.check(pg_temp.denied(format(
    $q$INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule, status) VALUES (%L, %L, 100, %s, 'Any day', 'accepted')$q$,
    req2_id, edu_id, unit_id)), 'educator cannot choose the offer status');
  UPDATE public.offers SET price = 180 WHERE id = offer1_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.check(n = 1, 'educator edits a pending offer');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.offers SET status = 'accepted' WHERE id = %L$q$, offer1_id)),
    'educator cannot accept their own offer by update');
  PERFORM pg_temp.check(pg_temp.fails_with(format($q$SELECT public.accept_offer(%L)$q$, offer1_id), 'P0002'),
    'educator cannot call accept_offer');

  -- Blind bidding
  PERFORM pg_temp.act_as(educator2_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req2_id, edu2_id, 150, unit_id, 'Weekends') RETURNING id INTO offer2_id;
  SELECT count(*) INTO n FROM public.offers WHERE request_id = req2_id;
  PERFORM pg_temp.check(n = 1, 'educators only see their own offers (blind bidding)');
  SELECT count(*) INTO n FROM public.get_offer_contact(offer1_id);
  PERFORM pg_temp.check(n = 0, 'no contacts from someone else offer');

  PERFORM pg_temp.act_as(NULL);
  PERFORM pg_temp.check(pg_temp.denied('SELECT count(*) FROM public.offers'), 'anon cannot read offers');

  -- The parent compares and accepts
  PERFORM pg_temp.act_as(parent_uid);
  SELECT count(*) INTO n FROM public.offers WHERE request_id = req2_id;
  PERFORM pg_temp.check(n = 2, 'parent sees every offer on their request');
  SELECT count(*) INTO n FROM public.get_offer_contact(offer1_id);
  PERFORM pg_temp.check(n = 0, 'no contacts before acceptance');
  UPDATE public.offers SET price = 1 WHERE id = offer1_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.check(n = 0, 'parent cannot edit an offer');
  PERFORM pg_temp.check(pg_temp.fails_with(format($q$SELECT public.withdraw_offer(%L)$q$, offer1_id), 'P0002'),
    'parent cannot withdraw an educator offer');
  PERFORM public.accept_offer(offer1_id);
  PERFORM pg_temp.check((SELECT status FROM public.offers WHERE id = offer1_id) = 'accepted', 'accepted offer is marked accepted');
  PERFORM pg_temp.check((SELECT status FROM public.offers WHERE id = offer2_id) = 'declined', 'other pending offers are declined');
  PERFORM pg_temp.check((SELECT status FROM public.requests WHERE id = req2_id) = 'closed', 'accepting closes the request');
  PERFORM pg_temp.check((SELECT phone FROM public.get_offer_contact(offer1_id)) = '01099990000',
    'parent gets the accepted educator phone');
  PERFORM pg_temp.check(pg_temp.fails_with(format($q$SELECT public.accept_offer(%L)$q$, offer2_id), '23514'),
    'a closed request cannot accept another offer');

  PERFORM pg_temp.act_as(educator_uid);
  PERFORM pg_temp.check((SELECT full_name FROM public.get_offer_contact(offer1_id)) = 'Test Parent',
    'accepted educator gets the parent contact');
  SELECT count(*) INTO n FROM public.requests WHERE id = req2_id;
  PERFORM pg_temp.check(n = 1, 'educator still sees a closed request they offered on');

  PERFORM pg_temp.act_as(educator2_uid);
  SELECT count(*) INTO n FROM public.get_offer_contact(offer1_id);
  PERFORM pg_temp.check(n = 0, 'declined educator gets no contacts');
  PERFORM pg_temp.check(pg_temp.fails_with(format($q$SELECT public.withdraw_offer(%L)$q$, offer2_id), '23514'),
    'a declined offer cannot be withdrawn');

  -- Closing a request archives its pending offers; a withdrawn offer can be sent again
  PERFORM pg_temp.act_as(parent_uid);
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (parent_uid, service_id, place_id, gov_id, 7, repeat('م', 60)) RETURNING id INTO req3_id;
  PERFORM pg_temp.act_as(educator2_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req3_id, edu2_id, 120, unit_id, 'Mornings') RETURNING id INTO offer3_id;
  PERFORM public.withdraw_offer(offer3_id);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req3_id, edu2_id, 110, unit_id, 'Mornings') RETURNING id INTO offer3_id;
  PERFORM pg_temp.check(true, 'educator can offer again after withdrawing');
  PERFORM pg_temp.act_as(parent_uid);
  UPDATE public.requests SET status = 'cancelled' WHERE id = req3_id;
  PERFORM pg_temp.act_as(educator2_uid);
  PERFORM pg_temp.check((SELECT status FROM public.offers WHERE id = offer3_id) = 'archived',
    'cancelling a request archives its pending offers');

  -- A suspended educator can no longer offer
  PERFORM pg_temp.act_as(parent_uid);
  UPDATE public.requests SET status = 'open' WHERE id = req3_id;
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu2_id, 'suspended', 'test');
  PERFORM pg_temp.act_as(educator2_uid);
  PERFORM pg_temp.check(pg_temp.denied(format($q$INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule) VALUES (%L, %L, 100, %s, 'Any day')$q$, req3_id, edu2_id, unit_id)),
    'suspended educator cannot offer');

  -- The admin's reason reaches only the educator it concerns (NAB-97)
  PERFORM pg_temp.check((SELECT verification_reason FROM public.educators WHERE id = edu2_id) = 'test',
    'suspended educator reads their own reason');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.educators SET verification_reason = NULL WHERE id = %L$q$, edu2_id)),
    'educator cannot change their own reason');
  PERFORM pg_temp.act_as(educator_uid);
  SELECT count(*) INTO n FROM public.educators WHERE id = edu2_id;
  PERFORM pg_temp.check(n = 0, 'another educator cannot read the reason');
  PERFORM pg_temp.act_as(parent_uid);
  SELECT count(*) INTO n FROM public.educators WHERE id = edu2_id;
  PERFORM pg_temp.check(n = 0, 'a parent cannot read the reason');
  PERFORM pg_temp.act_as(NULL);
  SELECT count(*) INTO n FROM public.educators WHERE id = edu2_id;
  PERFORM pg_temp.check(n = 0, 'a visitor cannot read the reason');
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu2_id, 'verified');
  PERFORM pg_temp.check((SELECT verification_reason FROM public.educators WHERE id = edu2_id) IS NULL,
    're-verifying clears the reason');
  PERFORM public.set_educator_verification(edu2_id, 'suspended', 'test');
  PERFORM pg_temp.act_as(educator2_uid);

  -- Admins remove offers (NAB-86)
  PERFORM pg_temp.act_as(parent_uid);
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.remove_offer(%L, 'x')$q$, offer1_id)),
    'parent cannot remove offers');
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.remove_offer(offer1_id, ' spam ');
  PERFORM public.remove_offer(offer1_id);  -- already removed: no-op, not logged again
  PERFORM pg_temp.check((SELECT status FROM public.offers WHERE id = offer1_id) = 'removed', 'admin removes an accepted offer');
  SELECT count(*) INTO n FROM public.admin_logs WHERE target_id = offer1_id AND action = 'offer.removed';
  PERFORM pg_temp.check(n = 1, 'offer removal logged once');
  PERFORM pg_temp.check((SELECT details->>'reason' FROM public.admin_logs WHERE target_id = offer1_id) = 'spam',
    'removal reason stored trimmed');
  PERFORM pg_temp.check(pg_temp.fails_with(format($q$SELECT public.remove_offer(%L)$q$, offer2_id), '23514'),
    'declined offers are not removable');
  PERFORM pg_temp.act_as(parent_uid);
  SELECT count(*) INTO n FROM public.get_offer_contact(offer1_id);
  PERFORM pg_temp.check(n = 0, 'removing an accepted offer takes the contacts away');

  -- Notifications: read-only for their recipient, written only by notify() (NAB-106)
  RESET ROLE;
  -- The steps above already created event notifications (NAB-96, checked below); start clean.
  DELETE FROM public.notifications WHERE recipient_id IN (parent_uid, educator_uid, educator2_uid, admin_uid);
  notif_p1 := public.notify(parent_uid, 'test.one', 'First', 'body', '/requests', '{"k":1}');
  notif_p2 := public.notify(parent_uid, 'test.two', 'Second');
  notif_e1 := public.notify(educator_uid, 'test.one', 'For the educator');
  PERFORM pg_temp.check(public.notify(NULL, 'test.none', 'Nobody') IS NULL, 'notify ignores a NULL recipient');

  PERFORM pg_temp.act_as(parent_uid);
  SELECT count(*) INTO n FROM public.notifications;
  PERFORM pg_temp.check(n = 2, 'parent sees only their own notifications');
  PERFORM pg_temp.act_as(educator_uid);
  SELECT count(*) INTO n FROM public.notifications;
  PERFORM pg_temp.check(n = 1, 'educator sees only their own notifications');
  PERFORM pg_temp.act_as(NULL);
  PERFORM pg_temp.check(pg_temp.denied('SELECT count(*) FROM public.notifications'), 'anon cannot read notifications');

  PERFORM pg_temp.act_as(educator_uid);
  PERFORM pg_temp.check(pg_temp.denied(format($q$INSERT INTO public.notifications (recipient_id, type, title) VALUES (%L, 'x', 'x')$q$, educator_uid)),
    'user cannot insert a notification directly');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.notifications SET title = 'x' WHERE id = %L$q$, notif_e1)),
    'user cannot edit a notification title');
  PERFORM pg_temp.check(pg_temp.denied(format($q$DELETE FROM public.notifications WHERE id = %L$q$, notif_e1)),
    'user cannot delete a notification');
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.notify(%L, 'x', 'x')$q$, educator_uid)),
    'authenticated cannot call notify()');
  PERFORM public.mark_notification_read(notif_p1);  -- someone else's: silent no-op
  RESET ROLE;
  PERFORM pg_temp.check((SELECT read_at FROM public.notifications WHERE id = notif_p1) IS NULL,
    'marking someone else notification read changes nothing');

  PERFORM pg_temp.act_as(parent_uid);
  PERFORM public.mark_notification_read(notif_p1);
  PERFORM pg_temp.check((SELECT read_at FROM public.notifications WHERE id = notif_p1) IS NOT NULL,
    'recipient marks a notification read');
  PERFORM pg_temp.check(public.mark_all_notifications_read() = 1, 'mark all read returns the unread count');
  PERFORM pg_temp.check(public.mark_all_notifications_read() = 0, 'mark all read again changes nothing');
  RESET ROLE;
  PERFORM pg_temp.check((SELECT read_at FROM public.notifications WHERE id = notif_e1) IS NULL,
    'mark all read leaves other users notifications unread');

  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_profile_active(parent_uid, false, 'notif test');
  PERFORM pg_temp.act_as(parent_uid);
  PERFORM pg_temp.check((SELECT NOT is_active FROM public.profiles WHERE id = parent_uid), 'parent is suspended');
  SELECT count(*) INTO n FROM public.notifications;
  PERFORM pg_temp.check(n = 2, 'suspended parent still reads their notifications');

  -- ---------- Educator notifications (NAB-96) ----------
  -- State here: edu_id verified, edu2_id suspended ('test'), parent suspended.
  RESET ROLE;
  DELETE FROM public.notifications WHERE recipient_id IN (parent_uid, educator_uid, educator2_uid, admin_uid);
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_profile_active(parent_uid, true);

  -- Verification decisions (all on educator 2)
  PERFORM public.set_educator_verification(edu2_id, 'verified');                -- suspended -> verified
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = educator2_uid;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid;
  PERFORM pg_temp.check(n = 1 AND nt.type = 'educator.reactivated' AND nt.title = 'تمت إعادة تفعيل حسابك' AND nt.link = '/teacher',
    'reactivating a suspended educator sends one educator.reactivated');

  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu2_id, 'verified');                -- no-op
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid;
  PERFORM pg_temp.check(n = 1, 'same verification status sends nothing');

  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu2_id, 'suspended', ' fake reviews ');
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = educator2_uid AND type = 'educator.suspended';
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid AND type = 'educator.suspended';
  PERFORM pg_temp.check(n = 1 AND nt.title = 'تم إيقاف حسابك' AND nt.link = '/teacher'
      AND nt.body = 'سبب القرار: fake reviews' AND nt.data->>'reason' = 'fake reviews',
    'suspension sends one educator.suspended with the reason');

  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu2_id, 'rejected');                -- no reason
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = educator2_uid AND type = 'educator.rejected';
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid AND type = 'educator.rejected';
  PERFORM pg_temp.check(n = 1 AND nt.title = 'لم يتم توثيق ملفك' AND nt.link = '/teacher/profile'
      AND nt.body IS NOT NULL AND nt.body NOT LIKE 'سبب القرار%' AND nt.data->'reason' = 'null'::jsonb,
    'rejection without a reason sends one educator.rejected with the generic line');

  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu2_id, 'pending');
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid;
  PERFORM pg_temp.check(n = 3, 'back to pending sends nothing');

  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu2_id, 'verified');                -- pending -> verified
  PERFORM public.set_educator_verification(edu2_id, 'rejected', 'blurry ID');
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid AND type = 'educator.verified'
    AND title = 'تم توثيق ملفك' AND link = '/teacher';
  PERFORM pg_temp.check(n = 1, 'first verification sends one educator.verified');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid AND type = 'educator.rejected'
    AND body = 'سبب القرار: blurry ID' AND data->>'reason' = 'blurry ID';
  PERFORM pg_temp.check(n = 1, 'rejection with a reason carries it in body and data');
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu2_id, 'verified');                -- rejected -> verified
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid AND type = 'educator.reactivated';
  PERFORM pg_temp.check(n = 2, 'rejected -> verified also sends educator.reactivated');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id IN (parent_uid, educator_uid, admin_uid);
  PERFORM pg_temp.check(n = 0, 'verification notifications reach only the educator concerned');

  PERFORM pg_temp.act_as(educator2_uid);
  SELECT count(*) INTO n FROM public.notifications;
  PERFORM pg_temp.check(n = 6, 'educator reads their verification notifications');
  PERFORM pg_temp.act_as(educator_uid);
  SELECT count(*) INTO n FROM public.notifications;
  PERFORM pg_temp.check(n = 0, 'another educator does not see them');

  -- Offer outcomes
  RESET ROLE;
  DELETE FROM public.notifications WHERE recipient_id IN (parent_uid, educator_uid, educator2_uid, admin_uid);
  PERFORM pg_temp.act_as(parent_uid);
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (parent_uid, service_id, place_id, gov_id, 8, repeat('ن', 60)) RETURNING id INTO req4_id;
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (parent_uid, service_id, place_id, gov_id, 9, repeat('ب', 60)) RETURNING id INTO req5_id;
  PERFORM pg_temp.act_as(educator_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req4_id, edu_id, 200, unit_id, 'Sundays') RETURNING id INTO offer4_id;
  UPDATE public.offers SET price = 190 WHERE id = offer4_id;                     -- not a status change
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req5_id, edu_id, 200, unit_id, 'Sundays') RETURNING id INTO offer8_id;
  PERFORM public.withdraw_offer(offer8_id);
  PERFORM pg_temp.act_as(educator2_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req4_id, edu2_id, 150, unit_id, 'Mondays') RETURNING id INTO offer5_id;
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req5_id, edu2_id, 150, unit_id, 'Mondays') RETURNING id INTO offer7_id;
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id IN (parent_uid, educator_uid, educator2_uid, admin_uid);
  PERFORM pg_temp.check(n = 0, 'sending, editing and withdrawing offers sends nothing');

  PERFORM pg_temp.act_as(parent_uid);
  PERFORM public.decline_offer(offer5_id);
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = educator2_uid;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid;
  PERFORM pg_temp.check(n = 1 AND nt.type = 'offer.declined' AND nt.title = 'لم يتم اختيار عرضك' AND nt.link = '/teacher/offers'
      AND nt.data->>'offer_id' = offer5_id::text AND nt.data->>'request_id' = req4_id::text,
    'parent decline sends one offer.declined with offer and request ids');

  PERFORM pg_temp.act_as(educator2_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req4_id, edu2_id, 140, unit_id, 'Mondays') RETURNING id INTO offer6_id;
  PERFORM pg_temp.act_as(parent_uid);
  PERFORM public.accept_offer(offer4_id);
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = educator_uid;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator_uid;
  PERFORM pg_temp.check(n = 1 AND nt.type = 'offer.accepted' AND nt.title = 'قبل ولي الأمر عرضك'
      AND nt.body = 'تواصل مع ولي الأمر لترتيب أول حصة.' AND nt.data->>'offer_id' = offer4_id::text,
    'acceptance sends one offer.accepted to the chosen educator');
  SELECT count(*) INTO n FROM public.notifications
    WHERE recipient_id = educator2_uid AND type = 'offer.declined' AND data->>'offer_id' = offer6_id::text;
  PERFORM pg_temp.check(n = 1, 'auto-declined competing offer sends one offer.declined');
  SELECT count(*) INTO n FROM public.notifications WHERE data->>'request_id' = req4_id::text AND type = 'offer.archived';
  PERFORM pg_temp.check(n = 0, 'closing by acceptance archives nothing extra');

  PERFORM pg_temp.act_as(parent_uid);
  UPDATE public.requests SET status = 'cancelled' WHERE id = req5_id;
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = educator2_uid AND type = 'offer.archived';
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid AND type = 'offer.archived';
  PERFORM pg_temp.check(n = 1 AND nt.title = 'أُغلق الطلب الذي قدمت عليه' AND nt.data->>'offer_id' = offer7_id::text,
    'cancelling a request sends one offer.archived per pending offer');
  SELECT count(*) INTO n FROM public.notifications WHERE data->>'offer_id' = offer8_id::text;
  PERFORM pg_temp.check(n = 0, 'a withdrawn offer gets no notification, even when the request closes');

  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.remove_offer(offer4_id, ' rude messages ');
  PERFORM public.remove_offer(offer4_id, 'again');                               -- no-op
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE type = 'offer.removed' AND recipient_id IN (parent_uid, educator_uid, educator2_uid, admin_uid);
  SELECT count(*) INTO n FROM public.notifications WHERE type = 'offer.removed' AND recipient_id IN (parent_uid, educator_uid, educator2_uid, admin_uid);
  PERFORM pg_temp.check(n = 1 AND nt.recipient_id = educator_uid AND nt.title = 'تمت إزالة عرضك من قِبل الإدارة'
      AND nt.body = 'سبب الإزالة: rude messages' AND nt.data->>'reason' = 'rude messages'
      AND nt.data->>'offer_id' = offer4_id::text AND nt.data->>'request_id' = req4_id::text,
    'admin removal sends one offer.removed with the reason, and nothing on repeat');

  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator_uid;
  PERFORM pg_temp.check(n = 2, 'educator 1 got exactly accepted + removed');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid;
  PERFORM pg_temp.check(n = 3, 'educator 2 got exactly declined + auto-declined + archived');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id IN (parent_uid, admin_uid);
  PERFORM pg_temp.check(n = 0, 'offer notifications go to educators only');

  PERFORM pg_temp.check(NOT has_function_privilege('authenticated', 'public.notify_educator_offer_status_change()', 'EXECUTE')
      AND NOT has_function_privilege('authenticated', 'public.notify_educator_verification_change()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.notify_educator_verification_change()', 'EXECUTE'),
    'clients cannot execute the notification trigger functions');

  RESET ROLE;
  RAISE NOTICE 'All permission checks passed.';
END $$;

ROLLBACK;
