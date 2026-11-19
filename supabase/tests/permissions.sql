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
  req6_id      uuid;
  req7_id      uuid;
  req8_id      uuid;
  offer9_id    uuid;
  offer10_id   uuid;
  offer11_id   uuid;
  offer12_id   uuid;
  parent_n     int;
  educator3_uid uuid := gen_random_uuid();
  admin2_uid   uuid := gen_random_uuid();
  edu3_id      uuid;
  admins_n     int;
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
  PERFORM pg_temp.check(n = 3, 'suspended parent still reads their notifications (2 + account.suspended, NAB-110)');

  -- ---------- Educator notifications (NAB-96) ----------
  -- State here: edu_id verified, edu2_id suspended ('test'), parent suspended.
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_profile_active(parent_uid, true);
  RESET ROLE;
  DELETE FROM public.notifications WHERE recipient_id IN (parent_uid, educator_uid, educator2_uid, admin_uid);
  PERFORM pg_temp.act_as(admin_uid);

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
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id IN (educator_uid, educator2_uid, admin_uid);
  PERFORM pg_temp.check(n = 0, 'sending, editing and withdrawing offers sends the educators nothing');

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
  SELECT count(*) INTO n FROM public.notifications WHERE data->>'offer_id' = offer8_id::text AND recipient_id <> parent_uid;
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
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = admin_uid
     OR (recipient_id = parent_uid AND type NOT IN ('offer.received', 'offer.updated', 'offer.withdrawn'));
  PERFORM pg_temp.check(n = 0, 'offer outcomes go to educators only (the parent gets only NAB-110 offer events)');

  PERFORM pg_temp.check(NOT has_function_privilege('authenticated', 'public.notify_educator_offer_status_change()', 'EXECUTE')
      AND NOT has_function_privilege('authenticated', 'public.notify_educator_verification_change()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.notify_educator_verification_change()', 'EXECUTE'),
    'clients cannot execute the notification trigger functions');

  -- ---------- Parent notifications (NAB-110) ----------
  -- State here: parent active, edu_id and edu2_id verified.
  RESET ROLE;
  DELETE FROM public.notifications WHERE recipient_id IN (parent_uid, educator_uid, educator2_uid, admin_uid);
  PERFORM pg_temp.act_as(parent_uid);
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (parent_uid, service_id, place_id, gov_id, 10, repeat('ق', 60)) RETURNING id INTO req6_id;

  -- New offer
  PERFORM pg_temp.act_as(educator_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req6_id, edu_id, 200, unit_id, 'Fridays') RETURNING id INTO offer9_id;
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = parent_uid;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid;
  PERFORM pg_temp.check(n = 1 AND nt.type = 'offer.received' AND nt.title = 'وصلك عرض جديد على طلبك'
      AND nt.link = '/parent/requests/' || req6_id
      AND nt.data->>'offer_id' = offer9_id::text AND nt.data->>'request_id' = req6_id::text,
    'a new offer sends the parent one offer.received with offer and request ids');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id IN (educator_uid, educator2_uid, admin_uid);
  PERFORM pg_temp.check(n = 0, 'offer.received reaches only the parent');

  -- Edits while pending, coalesced
  PERFORM pg_temp.act_as(educator_uid);
  UPDATE public.offers SET price = 210 WHERE id = offer9_id;
  UPDATE public.offers SET schedule = 'Fridays and Saturdays' WHERE id = offer9_id;
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = parent_uid AND type = 'offer.updated';
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'offer.updated';
  PERFORM pg_temp.check(n = 1 AND nt.title = 'عدّل المتخصص عرضه على طلبك' AND nt.link = '/parent/requests/' || req6_id
      AND nt.data->>'offer_id' = offer9_id::text,
    'two edits within 10 minutes send one offer.updated');
  PERFORM pg_temp.act_as(parent_uid);
  PERFORM public.mark_notification_read(nt.id);
  PERFORM pg_temp.act_as(educator_uid);
  UPDATE public.offers SET price = 210 WHERE id = offer9_id;                     -- same value
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'offer.updated';
  PERFORM pg_temp.check(n = 1, 'an edit that changes nothing sends nothing');
  PERFORM pg_temp.act_as(educator_uid);
  UPDATE public.offers SET notes = 'can also do online' WHERE id = offer9_id;
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'offer.updated';
  PERFORM pg_temp.check(n = 2, 'an edit after the parent read the last one notifies again');
  UPDATE public.notifications SET created_at = now() - interval '11 minutes'
    WHERE recipient_id = parent_uid AND type = 'offer.updated' AND read_at IS NULL;
  PERFORM pg_temp.act_as(educator_uid);
  UPDATE public.offers SET start_date = current_date + 7 WHERE id = offer9_id;
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'offer.updated';
  PERFORM pg_temp.check(n = 3, 'an unread offer.updated older than 10 minutes does not swallow a new edit');

  -- Withdrawal
  PERFORM pg_temp.act_as(educator_uid);
  PERFORM public.withdraw_offer(offer9_id);
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = parent_uid AND type = 'offer.withdrawn';
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'offer.withdrawn';
  PERFORM pg_temp.check(n = 1 AND nt.title = 'سحب المتخصص عرضه' AND nt.link = '/parent/requests/' || req6_id
      AND nt.data->>'offer_id' = offer9_id::text AND nt.data->>'request_id' = req6_id::text,
    'withdrawing an offer sends the parent one offer.withdrawn');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id IN (educator_uid, educator2_uid, admin_uid);
  PERFORM pg_temp.check(n = 0, 'the educator gets nothing for their own edits and withdrawal');

  -- Decline and accept (the parent's own actions) notify the parent of nothing
  PERFORM pg_temp.act_as(educator2_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req6_id, edu2_id, 150, unit_id, 'Mondays') RETURNING id INTO offer10_id;
  PERFORM pg_temp.act_as(educator_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req6_id, edu_id, 190, unit_id, 'Fridays') RETURNING id INTO offer11_id;
  RESET ROLE;
  SELECT count(*) INTO parent_n FROM public.notifications WHERE recipient_id = parent_uid;
  PERFORM pg_temp.check(parent_n = 7, 'each new offer sends its own offer.received');
  PERFORM pg_temp.act_as(parent_uid);
  PERFORM public.decline_offer(offer10_id);
  PERFORM public.accept_offer(offer11_id);
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid;
  PERFORM pg_temp.check(n = parent_n, 'decline_offer and accept_offer (closing the request) notify the parent of nothing');

  -- The parent's own request status changes notify nothing
  PERFORM pg_temp.act_as(parent_uid);
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (parent_uid, service_id, place_id, gov_id, 11, repeat('ك', 60)) RETURNING id INTO req7_id;
  UPDATE public.requests SET status = 'closed' WHERE id = req7_id;
  UPDATE public.requests SET status = 'open' WHERE id = req7_id;
  UPDATE public.requests SET status = 'cancelled' WHERE id = req7_id;
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid;
  PERFORM pg_temp.check(n = parent_n, 'closing, reopening and cancelling own request notify nothing');

  -- Admin moderation through set_request_status
  PERFORM pg_temp.act_as(parent_uid);
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (parent_uid, service_id, place_id, gov_id, 12, repeat('ل', 60)) RETURNING id INTO req8_id;
  PERFORM pg_temp.act_as(educator2_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (req8_id, edu2_id, 150, unit_id, 'Mondays') RETURNING id INTO offer12_id;
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_request_status(req8_id, 'removed', ' abusive text ');
  PERFORM public.set_request_status(req8_id, 'removed', 'again');                -- no-op
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = parent_uid AND type = 'request.removed';
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'request.removed';
  PERFORM pg_temp.check(n = 1 AND nt.title = 'تم إخفاء طلبك من قِبل الإدارة' AND nt.body = 'السبب: abusive text'
      AND nt.data->>'reason' = 'abusive text' AND nt.data->>'request_id' = req8_id::text
      AND nt.link = '/parent/requests/' || req8_id,
    'admin removal sends the parent one request.removed with the reason, nothing on repeat');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type LIKE 'offer.%'
    AND type NOT IN ('offer.received', 'offer.updated', 'offer.withdrawn');
  PERFORM pg_temp.check(n = 0, 'offers archived by the removal notify the parent of nothing');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator2_uid AND type = 'offer.archived'
    AND data->>'offer_id' = offer12_id::text;
  PERFORM pg_temp.check(n = 1, 'the educator still gets offer.archived for the removed request');

  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_request_status(req8_id, 'open');
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = parent_uid AND type = 'request.restored';
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'request.restored';
  PERFORM pg_temp.check(n = 1 AND nt.title = 'تمت إعادة نشر طلبك' AND nt.link = '/parent/requests/' || req8_id,
    'removed -> open sends one request.restored');

  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_request_status(req8_id, 'closed', ' duplicate ');
  PERFORM public.set_request_status(req8_id, 'cancelled');
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'request.closed_by_admin'
    AND title = 'تم إغلاق طلبك من قِبل الإدارة' AND body = 'السبب: duplicate' AND data->>'reason' = 'duplicate';
  PERFORM pg_temp.check(n = 1, 'admin closing sends request.closed_by_admin with the reason');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'request.closed_by_admin'
    AND body NOT LIKE 'السبب:%' AND data->'reason' = 'null'::jsonb;
  PERFORM pg_temp.check(n = 1, 'admin cancelling without a reason sends request.closed_by_admin with the generic line');

  -- Un-hiding to closed / cancelled is a restore, not a closure by the admin (NAB-118)
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_request_status(req8_id, 'removed', 'hide again');
  PERFORM public.set_request_status(req8_id, 'closed');                         -- the UI's "إلغاء الإخفاء"
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'request.restored'
    AND title = 'تم إلغاء إخفاء طلبك'
    AND body = 'طلبك ظاهر لك الآن لكنه مغلق، ويمكنك إعادة فتحه من صفحة الطلب.'
    AND data->>'status' = 'closed' AND link = '/parent/requests/' || req8_id;
  PERFORM pg_temp.check(n = 1, 'removed -> closed sends one request.restored "تم إلغاء إخفاء طلبك" (NAB-118)');
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_request_status(req8_id, 'removed');
  PERFORM public.set_request_status(req8_id, 'cancelled');
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'request.restored'
    AND title = 'تم إلغاء إخفاء طلبك' AND body = 'طلبك ظاهر لك الآن لكنه ملغى.' AND data->>'status' = 'cancelled';
  PERFORM pg_temp.check(n = 1, 'removed -> cancelled sends one request.restored with the cancelled line (NAB-118)');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'request.closed_by_admin';
  PERFORM pg_temp.check(n = 2, 'un-hiding to closed / cancelled sends no request.closed_by_admin (NAB-118)');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'request.restored'
    AND title = 'تمت إعادة نشر طلبك';
  PERFORM pg_temp.check(n = 1, 'only removed -> open says "تمت إعادة نشر طلبك" (NAB-118)');

  -- Account suspension and reactivation
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_profile_active(parent_uid, false, ' fake requests ');
  PERFORM public.set_profile_active(parent_uid, false, 'again');                 -- no-op
  RESET ROLE;
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = parent_uid AND type = 'account.suspended';
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'account.suspended';
  PERFORM pg_temp.check(n = 1 AND nt.title = 'تم إيقاف حسابك' AND nt.body = 'السبب: fake requests'
      AND nt.data->>'reason' = 'fake requests' AND nt.link = '/parent',
    'suspension sends the parent one account.suspended with the reason, nothing on repeat');
  PERFORM pg_temp.act_as(parent_uid);
  SELECT count(*) INTO n FROM public.notifications WHERE type = 'account.suspended';
  PERFORM pg_temp.check(n = 1, 'the suspended parent can read why');
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_profile_active(parent_uid, true);
  PERFORM public.set_profile_active(parent_uid, true);                           -- no-op
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid AND type = 'account.reactivated'
    AND title = 'تمت إعادة تفعيل حسابك' AND link = '/parent';
  PERFORM pg_temp.check(n = 1, 'reactivation sends one account.reactivated');

  -- Totals: exactly the expected events, and only to the parent
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = parent_uid;
  PERFORM pg_temp.check(n = 18, 'parent got exactly 4 received + 3 updated + 1 withdrawn + 8 request + 2 account');
  SELECT count(*) INTO n FROM public.notifications
    WHERE recipient_id IN (educator_uid, educator2_uid, admin_uid)
      AND (type LIKE 'request.%' OR type LIKE 'account.%' OR type IN ('offer.received', 'offer.updated', 'offer.withdrawn'));
  PERFORM pg_temp.check(n = 0, 'parent events reach nobody else');
  PERFORM pg_temp.check(NOT has_function_privilege('authenticated', 'public.notify_parent_offer_received()', 'EXECUTE')
      AND NOT has_function_privilege('authenticated', 'public.notify_parent_offer_updated()', 'EXECUTE')
      AND NOT has_function_privilege('authenticated', 'public.notify_parent_offer_withdrawn()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.notify_parent_offer_received()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.notify_parent_offer_updated()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.notify_parent_offer_withdrawn()', 'EXECUTE'),
    'clients cannot execute the parent notification trigger functions');

  -- ---------- Admin notifications and automatic re-review (NAB-111) ----------
  RESET ROLE;
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
    (educator3_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-educator3@example.invalid',
     '{"full_name":"Third Educator","role":"educator"}', now(), now()),
    (admin2_uid,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-admin2@example.invalid',
     '{"full_name":"Inactive Admin","role":"parent"}', now(), now());
  UPDATE public.profiles SET role = 'admin', is_active = false WHERE id = admin2_uid;
  -- Every active admin is notified; inside this rolled-back transaction that includes the real ones.
  SELECT count(*) INTO admins_n FROM public.profiles WHERE role = 'admin' AND is_active;
  PERFORM pg_temp.check(admins_n >= 1, 'there is at least one active admin (the test admin)');
  DELETE FROM public.notifications
    WHERE recipient_id IN (parent_uid, educator_uid, educator2_uid, admin_uid, educator3_uid, admin2_uid);

  -- New educator profile
  PERFORM pg_temp.act_as(educator3_uid);
  INSERT INTO public.educators (user_id, full_name, phone, governorate_id, bio, gender)
    VALUES (educator3_uid, 'Third Educator', '01277770000', gov_id, 'first bio', 'female') RETURNING id INTO edu3_id;
  INSERT INTO public.educator_subjects (educator_id, subject_id) VALUES (edu3_id, service_id);
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications
    WHERE type = 'admin.educator_pending' AND data->>'educator_id' = edu3_id::text;
  PERFORM pg_temp.check(n = admins_n, 'new educator profile notifies every active admin');
  SELECT count(DISTINCT recipient_id) INTO n FROM public.notifications
    WHERE type = 'admin.educator_pending' AND data->>'educator_id' = edu3_id::text
      AND recipient_id IN (SELECT id FROM public.profiles WHERE role = 'admin' AND is_active);
  PERFORM pg_temp.check(n = admins_n, 'exactly one admin.educator_pending per active admin');
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = admin_uid AND type = 'admin.educator_pending';
  PERFORM pg_temp.check(nt.title = 'ملف متخصص جديد بانتظار المراجعة' AND nt.link = '/admin/educators'
      AND nt.body LIKE '%Third Educator%' AND nt.data->>'educator_id' = edu3_id::text,
    'admin.educator_pending has the title, link, name and educator_id');
  SELECT count(*) INTO n FROM public.notifications
    WHERE recipient_id IN (admin2_uid, parent_uid, educator_uid, educator2_uid, educator3_uid);
  PERFORM pg_temp.check(n = 0, 'inactive admins and non-admins get no admin notification');
  PERFORM pg_temp.act_as(educator3_uid);
  SELECT count(*) INTO n FROM public.notifications;
  PERFORM pg_temp.check(n = 0, 'the educator cannot read admin notifications');
  PERFORM pg_temp.act_as(admin_uid);
  SELECT count(*) INTO n FROM public.notifications WHERE type = 'admin.educator_pending';
  PERFORM pg_temp.check(n = 1, 'the admin reads their own admin.educator_pending');

  -- Rejected educator edits their bio -> back to pending, admins notified once
  PERFORM public.set_educator_verification(edu3_id, 'rejected', 'missing ID');
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator3_uid AND type = 'educator.rejected';
  PERFORM pg_temp.check(n = 1, 'admin rejection still notifies the educator (NAB-96 unchanged)');
  SELECT count(*) INTO n FROM public.notifications WHERE type LIKE 'admin.%' AND data->>'educator_id' = edu3_id::text;
  PERFORM pg_temp.check(n = admins_n, 'an admin decision sends no admin notification');
  PERFORM pg_temp.act_as(educator3_uid);
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.educators SET verification_status = 'pending' WHERE id = %L$q$, edu3_id)),
    'rejected educator still cannot set verification_status directly');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.educators SET verification_reason = NULL WHERE id = %L$q$, edu3_id)),
    'rejected educator still cannot clear verification_reason directly');
  UPDATE public.educators SET bio = bio WHERE id = edu3_id;                     -- no-op
  RESET ROLE;
  PERFORM pg_temp.check((SELECT verification_status FROM public.educators WHERE id = edu3_id) = 'rejected'
      AND (SELECT verification_reason FROM public.educators WHERE id = edu3_id) = 'missing ID',
    'a no-op update leaves a rejected educator rejected');
  PERFORM pg_temp.act_as(educator3_uid);
  UPDATE public.educators SET bio = 'now with ID' WHERE id = edu3_id;
  RESET ROLE;
  PERFORM pg_temp.check((SELECT verification_status FROM public.educators WHERE id = edu3_id) = 'pending'
      AND (SELECT verification_reason FROM public.educators WHERE id = edu3_id) IS NULL,
    'rejected educator editing their bio goes back to pending and the reason is cleared');
  SELECT count(*) INTO n FROM public.notifications
    WHERE type = 'admin.educator_resubmitted' AND data->>'educator_id' = edu3_id::text;
  PERFORM pg_temp.check(n = admins_n, 'resubmission notifies every active admin once');
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = admin_uid AND type = 'admin.educator_resubmitted';
  PERFORM pg_temp.check(nt.title = 'عدّل متخصص مرفوض ملفه ويحتاج لإعادة المراجعة'
      AND nt.link = '/admin/educators?status=pending' AND nt.data->>'educator_id' = edu3_id::text,
    'admin.educator_resubmitted has the title, link and educator_id');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = admin2_uid;
  PERFORM pg_temp.check(n = 0, 'an inactive admin gets no resubmission notification');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator3_uid;
  PERFORM pg_temp.check(n = 1, 'the educator gets nothing for the automatic -> pending');

  PERFORM pg_temp.act_as(educator3_uid);
  UPDATE public.educators SET bio = 'edited again while pending' WHERE id = edu3_id;
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications
    WHERE type = 'admin.educator_resubmitted' AND data->>'educator_id' = edu3_id::text;
  PERFORM pg_temp.check(n = admins_n AND (SELECT verification_status FROM public.educators WHERE id = edu3_id) = 'pending',
    'a second edit while pending sends nothing');

  -- Saving only subjects (the profile form deletes and re-inserts them) also counts
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu3_id, 'rejected', 'add your subjects');
  PERFORM pg_temp.act_as(educator3_uid);
  DELETE FROM public.educator_subjects WHERE educator_id = edu3_id;
  INSERT INTO public.educator_subjects (educator_id, subject_id) VALUES (edu3_id, service_id);
  RESET ROLE;
  PERFORM pg_temp.check((SELECT verification_status FROM public.educators WHERE id = edu3_id) = 'pending'
      AND (SELECT verification_reason FROM public.educators WHERE id = edu3_id) IS NULL,
    'rejected educator saving subjects only goes back to pending');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = admin_uid AND type = 'admin.educator_resubmitted';
  PERFORM pg_temp.check(n = 2, 'a subjects-only resubmission notifies the admin once more (not once per row)');

  -- Admin paths unchanged
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu3_id, 'rejected', 'still blurry');
  PERFORM public.set_educator_verification(edu3_id, 'pending');                 -- the admin's own choice
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = admin_uid AND type = 'admin.educator_resubmitted';
  PERFORM pg_temp.check(n = 2, 'an admin moving rejected -> pending is not a resubmission');
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu3_id, 'verified');
  PERFORM pg_temp.act_as(educator3_uid);
  UPDATE public.educators SET bio = 'verified edit' WHERE id = edu3_id;
  DELETE FROM public.educator_subjects WHERE educator_id = edu3_id;
  RESET ROLE;
  PERFORM pg_temp.check((SELECT verification_status FROM public.educators WHERE id = edu3_id) = 'verified',
    'a verified educator editing stays verified');
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu3_id, 'suspended', 'complaint');
  PERFORM pg_temp.act_as(educator3_uid);
  UPDATE public.educators SET bio = 'suspended edit' WHERE id = edu3_id;
  RESET ROLE;
  PERFORM pg_temp.check((SELECT verification_status FROM public.educators WHERE id = edu3_id) = 'suspended'
      AND (SELECT verification_reason FROM public.educators WHERE id = edu3_id) = 'complaint',
    'a suspended educator editing stays suspended with the reason');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = admin_uid AND type LIKE 'admin.%';
  PERFORM pg_temp.check(n = 3, 'the admin got exactly 1 pending + 2 resubmitted for educator 3');
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = educator3_uid;
  PERFORM pg_temp.check(n = 5, 'educator 3 got only the admin decisions (3 rejected, 1 verified, 1 suspended)');

  -- Edits without an educator session are not a resubmission; deleting a rejected profile still works
  PERFORM pg_temp.act_as(admin_uid);
  PERFORM public.set_educator_verification(edu3_id, 'rejected', 'final');
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);
  UPDATE public.educators SET bio = 'operator fix' WHERE id = edu3_id;
  INSERT INTO public.educator_subjects (educator_id, subject_id) VALUES (edu3_id, service_id);
  PERFORM pg_temp.check((SELECT verification_status FROM public.educators WHERE id = edu3_id) = 'rejected',
    'an edit without an educator session leaves the status alone');
  PERFORM pg_temp.act_as(educator3_uid);
  DELETE FROM public.educators WHERE id = edu3_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.check(n = 1, 'a rejected educator can still delete their profile (the cascade does not trip the triggers)');
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE recipient_id = admin_uid AND type LIKE 'admin.%';
  PERFORM pg_temp.check(n = 3, 'none of that notified the admin');

  PERFORM pg_temp.check(NOT has_function_privilege('authenticated', 'public.notify_admins(text, text, text, text, jsonb)', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.notify_admins(text, text, text, text, jsonb)', 'EXECUTE')
      AND NOT has_function_privilege('authenticated', 'public.notify_admins_educator_created()', 'EXECUTE')
      AND NOT has_function_privilege('authenticated', 'public.notify_admins_educator_resubmitted()', 'EXECUTE')
      AND NOT has_function_privilege('authenticated', 'public.educator_back_to_review_on_edit()', 'EXECUTE')
      AND NOT has_function_privilege('authenticated', 'public.educator_back_to_review_on_list_edit()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.notify_admins_educator_created()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.notify_admins_educator_resubmitted()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.educator_back_to_review_on_edit()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.educator_back_to_review_on_list_edit()', 'EXECUTE'),
    'clients cannot execute the admin notification / re-review functions');

  RESET ROLE;
  RAISE NOTICE 'All permission checks passed.';
END $$;

-- ---------- NAB-124: contact messages ----------
DO $$
DECLARE
  cm_parent_uid   uuid := gen_random_uuid();
  cm_educator_uid uuid := gen_random_uuid();
  cm_admin_uid    uuid := gen_random_uuid();
  msg_id          uuid;
  msg2_id         uuid;
  handled         timestamptz;
  n               int;
  admins_n        int := (SELECT count(*) FROM public.profiles WHERE role = 'admin' AND is_active) + 1;
  nt              public.notifications%ROWTYPE;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
    (cm_parent_uid,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-cm-parent@example.invalid',
     '{"full_name":"CM Parent","role":"parent"}', now(), now()),
    (cm_educator_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-cm-educator@example.invalid',
     '{"full_name":"CM Educator","role":"educator"}', now(), now()),
    (cm_admin_uid,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-cm-admin@example.invalid',
     '{"full_name":"CM Admin","role":"parent"}', now(), now());
  UPDATE public.profiles SET role = 'admin' WHERE id = cm_admin_uid;

  -- Anonymous visitor submits
  PERFORM pg_temp.act_as(NULL);
  msg_id := public.submit_contact_message('  زائر  ', ' Visitor@Example.invalid ', NULL, ' سؤال ', '  أريد أن أسأل عن المنصة  ');
  PERFORM pg_temp.check(msg_id IS NOT NULL, 'anon can submit a contact message');
  PERFORM pg_temp.check(pg_temp.denied(
    $q$INSERT INTO public.contact_messages (name, email, message) VALUES ('x', 'x@y.zz', 'direct insert!!')$q$),
    'anon cannot insert into contact_messages directly');
  PERFORM pg_temp.check(pg_temp.denied('SELECT count(*) FROM public.contact_messages'),
    'anon cannot read contact messages');
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.mark_contact_message_handled(%L)$q$, msg_id)),
    'anon cannot call mark_contact_message_handled');
  RESET ROLE;
  PERFORM pg_temp.check((SELECT name = 'زائر' AND email = 'visitor@example.invalid' AND subject = 'سؤال'
        AND message = 'أريد أن أسأل عن المنصة' AND sender_id IS NULL AND handled_at IS NULL
      FROM public.contact_messages WHERE id = msg_id),
    'the message is stored trimmed, email lower-cased, no sender for anon');

  -- Admins notified, nobody else
  SELECT count(*) INTO n FROM public.notifications
    WHERE type = 'admin.contact_message' AND data->>'contact_message_id' = msg_id::text;
  PERFORM pg_temp.check(n = admins_n, 'every active admin gets admin.contact_message once');
  SELECT count(*) INTO n FROM public.notifications x JOIN public.profiles p ON p.id = x.recipient_id
    WHERE x.data->>'contact_message_id' = msg_id::text AND NOT (p.role = 'admin' AND p.is_active);
  PERFORM pg_temp.check(n = 0, 'nobody but active admins is notified of a contact message');
  SELECT * INTO nt FROM public.notifications WHERE recipient_id = cm_admin_uid AND type = 'admin.contact_message';
  PERFORM pg_temp.check(nt.title = 'رسالة جديدة من صفحة تواصل معنا' AND nt.body = 'زائر — سؤال'
      AND nt.link = '/admin/messages',
    'admin.contact_message has the title, name + subject body and link');

  -- Validation (trimmed lengths)
  PERFORM pg_temp.act_as(NULL);
  PERFORM pg_temp.check(pg_temp.fails_with($q$SELECT public.submit_contact_message('   ', 'a@b.cc', NULL, NULL, 'long enough message')$q$, '23514'),
    'blank name is rejected');
  PERFORM pg_temp.check(pg_temp.fails_with(format($q$SELECT public.submit_contact_message(%L, 'a@b.cc', NULL, NULL, 'long enough message')$q$, repeat('n', 101)), '23514'),
    'name over 100 chars is rejected');
  PERFORM pg_temp.check(pg_temp.fails_with($q$SELECT public.submit_contact_message('Name', NULL, NULL, NULL, 'long enough message')$q$, '23514'),
    'a message without email or phone is rejected');
  PERFORM pg_temp.check(pg_temp.fails_with($q$SELECT public.submit_contact_message('Name', ' ', '  ', NULL, 'long enough message')$q$, '23514'),
    'blank email and phone count as missing');
  PERFORM pg_temp.check(pg_temp.fails_with($q$SELECT public.submit_contact_message('Name', 'not-an-email', NULL, NULL, 'long enough message')$q$, '23514'),
    'a malformed email is rejected');
  PERFORM pg_temp.check(pg_temp.fails_with($q$SELECT public.submit_contact_message('Name', NULL, 'call me', NULL, 'long enough message')$q$, '23514'),
    'a malformed phone is rejected');
  PERFORM pg_temp.check(pg_temp.fails_with(format($q$SELECT public.submit_contact_message('Name', 'a@b.cc', NULL, %L, 'long enough message')$q$, repeat('s', 151)), '23514'),
    'subject over 150 chars is rejected');
  PERFORM pg_temp.check(pg_temp.fails_with($q$SELECT public.submit_contact_message('Name', 'a@b.cc', NULL, NULL, '   short   ')$q$, '23514'),
    'a message under 10 chars (trimmed) is rejected');
  PERFORM pg_temp.check(pg_temp.fails_with(format($q$SELECT public.submit_contact_message('Name', 'a@b.cc', NULL, NULL, %L)$q$, repeat('m', 2001)), '23514'),
    'a message over 2000 chars is rejected');
  msg2_id := public.submit_contact_message('Phone only', NULL, '+20 100 000 0000', NULL, 'call me back please');
  PERFORM pg_temp.check(msg2_id IS NOT NULL, 'phone alone is enough to submit');

  -- Rate limit: 5 per hour per email (case-insensitive)
  FOR i IN 1..4 LOOP
    PERFORM public.submit_contact_message('Visitor', 'VISITOR@example.invalid', NULL, NULL, 'message number ' || i);
  END LOOP;
  PERFORM pg_temp.check(pg_temp.fails_with($q$SELECT public.submit_contact_message('Visitor', 'visitor@example.invalid', NULL, NULL, 'one message too many')$q$, 'PT429'),
    'the 6th message in an hour from the same email is rate limited (PT429)');
  PERFORM pg_temp.check(public.submit_contact_message('Visitor', 'other@example.invalid', NULL, NULL, 'a different address') IS NOT NULL,
    'another email is not affected by that limit');

  -- Rate limit: 5 per hour per signed-in sender, whatever the email
  PERFORM pg_temp.act_as(cm_parent_uid);
  FOR i IN 1..5 LOOP
    PERFORM public.submit_contact_message('CM Parent', 'p' || i || '@example.invalid', NULL, NULL, 'parent message ' || i);
  END LOOP;
  PERFORM pg_temp.check(pg_temp.fails_with($q$SELECT public.submit_contact_message('CM Parent', 'p6@example.invalid', NULL, NULL, 'parent message 6')$q$, 'PT429'),
    'the 6th message in an hour from the same signed-in sender is rate limited');
  SELECT count(*) INTO n FROM public.contact_messages;
  PERFORM pg_temp.check(n = 0, 'a parent cannot read contact messages, not even their own');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.contact_messages SET handled_at = now() WHERE id = %L$q$, msg_id)),
    'a parent cannot update contact messages');
  PERFORM pg_temp.check(pg_temp.denied(format($q$DELETE FROM public.contact_messages WHERE id = %L$q$, msg_id)),
    'a parent cannot delete contact messages');
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.mark_contact_message_handled(%L)$q$, msg_id)),
    'a parent cannot mark a message handled');
  RESET ROLE;
  PERFORM pg_temp.check((SELECT count(*) FROM public.contact_messages WHERE sender_id = cm_parent_uid) = 5,
    'signed-in messages record sender_id');

  -- Educator
  PERFORM pg_temp.act_as(cm_educator_uid);
  PERFORM pg_temp.check(public.submit_contact_message('CM Educator', NULL, '01012345678', 'دعم', 'educator needs help') IS NOT NULL,
    'an educator can submit a contact message');
  SELECT count(*) INTO n FROM public.contact_messages;
  PERFORM pg_temp.check(n = 0, 'an educator cannot read contact messages');
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.mark_contact_message_handled(%L)$q$, msg_id)),
    'an educator cannot mark a message handled');
  SELECT count(*) INTO n FROM public.notifications WHERE type = 'admin.contact_message';
  PERFORM pg_temp.check(n = 0, 'an educator cannot read admin contact notifications');

  -- Admin
  PERFORM pg_temp.act_as(cm_admin_uid);
  SELECT count(*) INTO n FROM public.contact_messages WHERE id IN (msg_id, msg2_id);
  PERFORM pg_temp.check(n = 2, 'an admin reads contact messages');
  PERFORM pg_temp.check(pg_temp.denied(format($q$UPDATE public.contact_messages SET handled_at = now() WHERE id = %L$q$, msg_id)),
    'even an admin cannot update contact messages directly');
  handled := public.mark_contact_message_handled(msg_id);
  PERFORM pg_temp.check(handled IS NOT NULL, 'an admin marks a message handled');
  PERFORM pg_temp.check(public.mark_contact_message_handled(msg_id) = handled, 'marking again returns the original handled_at');
  PERFORM pg_temp.check(pg_temp.fails_with(format($q$SELECT public.mark_contact_message_handled(%L)$q$, gen_random_uuid()), 'P0002'),
    'an unknown message id is reported as not found');
  RESET ROLE;
  PERFORM pg_temp.check((SELECT handled_by FROM public.contact_messages WHERE id = msg_id) = cm_admin_uid,
    'handled_by records the admin');
  SELECT count(*) INTO n FROM public.admin_logs
    WHERE action = 'contact_message.handled' AND target_type = 'contact_message' AND target_id = msg_id AND admin_id = cm_admin_uid;
  PERFORM pg_temp.check(n = 1, 'handling is logged once in admin_logs');

  -- An inactive admin is no longer an admin here
  UPDATE public.profiles SET is_active = false WHERE id = cm_admin_uid;
  PERFORM pg_temp.act_as(cm_admin_uid);
  PERFORM pg_temp.check(pg_temp.denied(format($q$SELECT public.mark_contact_message_handled(%L)$q$, msg2_id)),
    'an inactive admin cannot mark a message handled');
  SELECT count(*) INTO n FROM public.contact_messages;
  PERFORM pg_temp.check(n = 0, 'an inactive admin cannot read contact messages');

  RESET ROLE;
  PERFORM pg_temp.check(NOT has_function_privilege('anon', 'public.mark_contact_message_handled(uuid)', 'EXECUTE')
      AND has_function_privilege('anon', 'public.submit_contact_message(text, text, text, text, text)', 'EXECUTE')
      AND has_function_privilege('authenticated', 'public.submit_contact_message(text, text, text, text, text)', 'EXECUTE')
      AND NOT has_table_privilege('anon', 'public.contact_messages', 'SELECT')
      AND NOT has_table_privilege('authenticated', 'public.contact_messages', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.contact_messages', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.contact_messages', 'DELETE'),
    'contact_messages grants: submit for everyone, no direct writes, mark-handled not for anon');
  RAISE NOTICE 'NAB-124 contact message checks passed.';
END $$;

-- ---------- NAB-125: admin pilot stats ----------
-- Live data changes between runs, so the checks compare a snapshot taken before the fixtures
-- with one taken after (b1 - b0 at a jsonb path).
CREATE FUNCTION pg_temp.stat_delta(b0 jsonb, b1 jsonb, path text[]) RETURNS int
LANGUAGE sql AS $$ SELECT (b1 #>> path)::int - (b0 #>> path)::int $$;
GRANT EXECUTE ON FUNCTION pg_temp.stat_delta(jsonb, jsonb, text[]) TO anon, authenticated;

DO $$
DECLARE
  st_admin_uid      uuid := gen_random_uuid();
  st_parent_uid     uuid := gen_random_uuid();
  st_educator_uid   uuid := gen_random_uuid();
  st_e2e_parent_uid uuid := gen_random_uuid();
  st_e2e_edu_uid    uuid := gen_random_uuid();
  st_edu_id         uuid;
  st_e2e_edu_id     uuid;
  st_req1           uuid;
  st_req2           uuid;
  st_req_marked     uuid;
  st_req_e2e        uuid;
  st_offer1         uuid;
  service_id        smallint := (SELECT min(id) FROM public.service_categories);
  place_id          smallint := (SELECT min(id) FROM public.teaching_places);
  gov_id            smallint := (SELECT min(id) FROM public.governorates);
  unit_id           smallint := (SELECT min(id) FROM public.pricing_units);
  b0                jsonb;
  b1                jsonb;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
    (st_admin_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-st-admin@example.invalid',
     '{"full_name":"ST Admin","role":"parent"}', now(), now());
  UPDATE public.profiles SET role = 'admin' WHERE id = st_admin_uid;

  PERFORM pg_temp.act_as(st_admin_uid);
  b0 := public.admin_pilot_stats();
  PERFORM pg_temp.check(b0 ?& ARRAY['parents', 'educators', 'educators_by_status', 'requests', 'offers',
                                   'avg_offers_per_request', 'median_hours_to_first_offer', 'matches', 'generated_at']
      AND b0->'parents' ?& ARRAY['total', 'last_7_days']
      AND b0->'educators' ?& ARRAY['total', 'last_7_days']
      AND b0->'educators_by_status' ?& ARRAY['pending', 'verified', 'rejected', 'suspended']
      AND b0->'requests' ?& ARRAY['posted', 'open', 'closed', 'cancelled', 'removed']
      AND b0->'requests'->'posted' ?& ARRAY['total', 'last_7_days']
      AND b0->'offers' ?& ARRAY['sent', 'pending', 'accepted', 'declined', 'withdrawn']
      AND b0->'offers'->'sent' ?& ARRAY['total', 'last_7_days']
      AND b0->'matches' ?& ARRAY['total', 'last_7_days'],
    'admin gets admin_pilot_stats with the documented shape');

  -- Fixtures: one real parent + educator, one e2e parent + educator (by the +e2e- email tag)
  RESET ROLE;
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
    (st_parent_uid,     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-st-parent@example.invalid',
     '{"full_name":"ST Parent","role":"parent"}', now(), now()),
    (st_educator_uid,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-st-educator@example.invalid',
     '{"full_name":"ST Educator","role":"educator"}', now(), now()),
    (st_e2e_parent_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-st+e2e-parent@example.invalid',
     '{"full_name":"ST e2e Parent","role":"parent"}', now(), now()),
    (st_e2e_edu_uid,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-st+e2e-educator@example.invalid',
     '{"full_name":"ST e2e Educator","role":"educator"}', now(), now());

  PERFORM pg_temp.act_as(st_educator_uid);
  INSERT INTO public.educators (user_id, full_name, phone, governorate_id, bio, experience_years, gender)
    VALUES (st_educator_uid, 'ST Educator', '01099990001', gov_id, 'bio', 2, 'male') RETURNING id INTO st_edu_id;
  INSERT INTO public.educator_locations (educator_id, governorate_id) VALUES (st_edu_id, gov_id);
  PERFORM pg_temp.act_as(st_e2e_edu_uid);
  INSERT INTO public.educators (user_id, full_name, phone, governorate_id, bio, experience_years, gender)
    VALUES (st_e2e_edu_uid, 'ST e2e Educator', '01099990002', gov_id, 'bio', 2, 'male') RETURNING id INTO st_e2e_edu_id;

  PERFORM pg_temp.act_as(st_admin_uid);
  b1 := public.admin_pilot_stats();
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{parents,total}') = 1
      AND pg_temp.stat_delta(b0, b1, '{parents,last_7_days}') = 1
      AND pg_temp.stat_delta(b0, b1, '{educators,total}') = 1
      AND pg_temp.stat_delta(b0, b1, '{educators,last_7_days}') = 1,
    'pilot stats count the new parent and educator, not the e2e accounts or the admin');
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{educators_by_status,pending}') = 1,
    'pilot stats count the pending educator profile, not the e2e one');

  PERFORM public.set_educator_verification(st_edu_id, 'verified');
  PERFORM public.set_educator_verification(st_e2e_edu_id, 'verified');

  -- Requests: two real, one marked [E2E], one by the e2e parent
  PERFORM pg_temp.act_as(st_parent_uid);
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (st_parent_uid, service_id, place_id, gov_id, 7, 'stats request one ' || repeat('x', 60)) RETURNING id INTO st_req1;
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (st_parent_uid, service_id, place_id, gov_id, 7, 'stats request two ' || repeat('x', 60)) RETURNING id INTO st_req2;
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (st_parent_uid, service_id, place_id, gov_id, 7, '[E2E] marked request ' || repeat('x', 60)) RETURNING id INTO st_req_marked;
  PERFORM pg_temp.act_as(st_e2e_parent_uid);
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (st_e2e_parent_uid, service_id, place_id, gov_id, 7, 'e2e parent request ' || repeat('x', 60)) RETURNING id INTO st_req_e2e;

  -- Offers: real educator on req1, req2 and the marked request; e2e educator on req1 and req2
  PERFORM pg_temp.act_as(st_educator_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (st_req1, st_edu_id, 100, unit_id, 'Any day') RETURNING id INTO st_offer1;
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule) VALUES (st_req2, st_edu_id, 100, unit_id, 'Any day');
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule) VALUES (st_req_marked, st_edu_id, 100, unit_id, 'Any day');
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule) VALUES (st_req_e2e, st_edu_id, 100, unit_id, 'Any day');
  PERFORM pg_temp.act_as(st_e2e_edu_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule) VALUES (st_req1, st_e2e_edu_id, 90, unit_id, 'Weekends');
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule) VALUES (st_req2, st_e2e_edu_id, 90, unit_id, 'Weekends');

  -- The parent accepts the real offer on req1 (req1 closes, the e2e offer there is declined)
  PERFORM pg_temp.act_as(st_parent_uid);
  PERFORM public.accept_offer(st_offer1);

  PERFORM pg_temp.act_as(st_admin_uid);
  b1 := public.admin_pilot_stats();
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{educators_by_status,verified}') = 1
      AND pg_temp.stat_delta(b0, b1, '{educators_by_status,pending}') = 0,
    'verifying moves the real educator to verified; the e2e educator is not counted');
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{requests,posted,total}') = 2
      AND pg_temp.stat_delta(b0, b1, '{requests,posted,last_7_days}') = 2
      AND pg_temp.stat_delta(b0, b1, '{requests,open}') = 1
      AND pg_temp.stat_delta(b0, b1, '{requests,closed}') = 1,
    'pilot stats count the two real requests, not the [E2E]-marked one or the e2e parent''s');
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{offers,sent,total}') = 2
      AND pg_temp.stat_delta(b0, b1, '{offers,sent,last_7_days}') = 2
      AND pg_temp.stat_delta(b0, b1, '{offers,accepted}') = 1
      AND pg_temp.stat_delta(b0, b1, '{offers,pending}') = 1
      AND pg_temp.stat_delta(b0, b1, '{offers,declined}') = 0,
    'pilot stats count the real educator''s offers on real requests only');
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{matches,total}') = 1
      AND pg_temp.stat_delta(b0, b1, '{matches,last_7_days}') = 1,
    'the accepted offer is a match');
  PERFORM pg_temp.check(jsonb_typeof(b1->'avg_offers_per_request') = 'number'
      AND (b1->>'avg_offers_per_request')::numeric >= 1
      AND jsonb_typeof(b1->'median_hours_to_first_offer') = 'number'
      AND (b1->>'median_hours_to_first_offer')::numeric >= 0,
    'average offers per request and median hours to first offer are numbers once there are offers');

  -- Denied: parent, educator, anon, inactive admin
  PERFORM pg_temp.act_as(st_parent_uid);
  PERFORM pg_temp.check(pg_temp.denied('SELECT public.admin_pilot_stats()'), 'a parent cannot read pilot stats');
  PERFORM pg_temp.act_as(st_educator_uid);
  PERFORM pg_temp.check(pg_temp.denied('SELECT public.admin_pilot_stats()'), 'an educator cannot read pilot stats');
  PERFORM pg_temp.act_as(NULL);
  PERFORM pg_temp.check(pg_temp.denied('SELECT public.admin_pilot_stats()'), 'anon cannot read pilot stats');
  RESET ROLE;
  UPDATE public.profiles SET is_active = false WHERE id = st_admin_uid;
  PERFORM pg_temp.act_as(st_admin_uid);
  PERFORM pg_temp.check(pg_temp.denied('SELECT public.admin_pilot_stats()'), 'an inactive admin cannot read pilot stats');

  RESET ROLE;
  PERFORM pg_temp.check(NOT has_function_privilege('anon', 'public.admin_pilot_stats()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.e2e_account_ids()', 'EXECUTE')
      AND NOT has_function_privilege('authenticated', 'public.e2e_account_ids()', 'EXECUTE'),
    'anon cannot execute admin_pilot_stats; nobody can call e2e_account_ids directly');
  RAISE NOTICE 'NAB-125 pilot stats checks passed.';
END $$;

-- ---------- NAB-123: public home stats ----------
DO $$
DECLARE
  hs_admin_uid    uuid := gen_random_uuid();
  hs_parent_uid   uuid := gen_random_uuid();
  hs_educator_uid uuid := gen_random_uuid();
  hs_e2e_edu_uid  uuid := gen_random_uuid();
  hs_edu_id       uuid;
  hs_e2e_edu_id   uuid;
  hs_req_open     uuid;
  hs_req_match    uuid;
  hs_offer        uuid;
  service_id      smallint := (SELECT min(id) FROM public.service_categories);
  place_id        smallint := (SELECT min(id) FROM public.teaching_places);
  unit_id         smallint := (SELECT min(id) FROM public.pricing_units);
  -- Two governorates no verified educator covers yet (NULL when every one is covered)
  uncovered       smallint[] := ARRAY(
    SELECT g.id FROM public.governorates g
    WHERE g.id NOT IN (SELECT governorate_id FROM public.educators
                       WHERE verification_status = 'verified' AND is_active AND governorate_id IS NOT NULL)
      AND g.id NOT IN (SELECT lo.governorate_id FROM public.educator_locations lo
                       JOIN public.educators e ON e.id = lo.educator_id
                       WHERE e.verification_status = 'verified' AND e.is_active AND lo.governorate_id IS NOT NULL)
    ORDER BY g.id LIMIT 2);
  gov_real        smallint;
  gov_e2e         smallint;
  b0              jsonb;
  b1              jsonb;
BEGIN
  gov_real := COALESCE(uncovered[1], (SELECT min(id) FROM public.governorates));
  gov_e2e  := COALESCE(uncovered[2], gov_real);

  PERFORM pg_temp.act_as(NULL);
  b0 := public.public_home_stats();
  PERFORM pg_temp.check((SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(b0) AS k)
        = ARRAY['accepted_offers_total', 'governorates_covered', 'open_requests', 'verified_active_educators']
      AND (SELECT bool_and(jsonb_typeof(v) = 'number') FROM jsonb_each(b0) AS x(k, v)),
    'anon gets public_home_stats: exactly four numbers, nothing else');

  RESET ROLE;
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
    (hs_admin_uid,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-hs-admin@example.invalid',
     '{"full_name":"HS Admin","role":"parent"}', now(), now()),
    (hs_parent_uid,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-hs-parent@example.invalid',
     '{"full_name":"HS Parent","role":"parent"}', now(), now()),
    (hs_educator_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-hs-educator@example.invalid',
     '{"full_name":"HS Educator","role":"educator"}', now(), now()),
    (hs_e2e_edu_uid,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'perm-hs+e2e-educator@example.invalid',
     '{"full_name":"HS e2e Educator","role":"educator"}', now(), now());
  UPDATE public.profiles SET role = 'admin' WHERE id = hs_admin_uid;

  PERFORM pg_temp.act_as(hs_educator_uid);
  INSERT INTO public.educators (user_id, full_name, phone, governorate_id, bio, experience_years, gender)
    VALUES (hs_educator_uid, 'HS Educator', '01099990003', gov_real, 'bio', 4, 'female') RETURNING id INTO hs_edu_id;
  INSERT INTO public.educator_locations (educator_id, governorate_id) VALUES (hs_edu_id, gov_real);
  PERFORM pg_temp.act_as(hs_e2e_edu_uid);
  INSERT INTO public.educators (user_id, full_name, phone, governorate_id, bio, experience_years, gender)
    VALUES (hs_e2e_edu_uid, 'HS e2e Educator', '01099990004', gov_e2e, 'bio', 4, 'female') RETURNING id INTO hs_e2e_edu_id;
  INSERT INTO public.educator_locations (educator_id, governorate_id) VALUES (hs_e2e_edu_id, gov_e2e);

  PERFORM pg_temp.act_as(NULL);
  b1 := public.public_home_stats();
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{verified_active_educators}') = 0
      AND pg_temp.stat_delta(b0, b1, '{governorates_covered}') = 0,
    'pending educators are not counted on the home page');

  PERFORM pg_temp.act_as(hs_admin_uid);
  PERFORM public.set_educator_verification(hs_edu_id, 'verified');
  PERFORM public.set_educator_verification(hs_e2e_edu_id, 'verified');

  PERFORM pg_temp.act_as(hs_parent_uid);
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (hs_parent_uid, service_id, place_id, gov_real, 8, 'home stats open ' || repeat('x', 60)) RETURNING id INTO hs_req_open;
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (hs_parent_uid, service_id, place_id, gov_real, 8, 'home stats match ' || repeat('x', 60)) RETURNING id INTO hs_req_match;
  INSERT INTO public.requests (parent_id, service_category_id, teaching_place_id, governorate_id, student_age, description)
    VALUES (hs_parent_uid, service_id, place_id, gov_real, 8, '[E2E] home stats ' || repeat('x', 60));
  PERFORM pg_temp.act_as(hs_educator_uid);
  INSERT INTO public.offers (request_id, educator_id, price, pricing_unit_id, schedule)
    VALUES (hs_req_match, hs_edu_id, 120, unit_id, 'Any day') RETURNING id INTO hs_offer;
  PERFORM pg_temp.act_as(hs_parent_uid);
  PERFORM public.accept_offer(hs_offer);

  PERFORM pg_temp.act_as(NULL);
  b1 := public.public_home_stats();
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{verified_active_educators}') = 1,
    'a newly verified educator is counted; the verified e2e educator is not');
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{governorates_covered}') = CASE WHEN uncovered[1] IS NULL THEN 0 ELSE 1 END,
    'the real educator''s governorate is covered; the e2e educator''s is not');
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{open_requests}') = 1,
    'the open request is counted; the [E2E] one and the matched (closed) one are not');
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{accepted_offers_total}') = 1,
    'the accepted offer is counted');

  -- A suspended parent's open request leaves the public feed and the counter
  PERFORM pg_temp.act_as(hs_admin_uid);
  PERFORM public.set_profile_active(hs_parent_uid, false);
  PERFORM pg_temp.act_as(hs_parent_uid);
  b1 := public.public_home_stats();
  PERFORM pg_temp.check(pg_temp.stat_delta(b0, b1, '{open_requests}') = 0,
    'open requests of suspended parents are not counted (and authenticated users can call it)');

  RESET ROLE;
  PERFORM pg_temp.check(has_function_privilege('anon', 'public.public_home_stats()', 'EXECUTE')
      AND has_function_privilege('authenticated', 'public.public_home_stats()', 'EXECUTE'),
    'public_home_stats is executable by anon and authenticated');
  RAISE NOTICE 'NAB-123 public home stats checks passed.';
END $$;

ROLLBACK;
