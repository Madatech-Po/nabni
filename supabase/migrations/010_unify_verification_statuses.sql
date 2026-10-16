-- Migration: 010_unify_verification_statuses.sql
-- Description: NAB-36. educators.verification_status (enum pending/approved/rejected) disagreed
-- with the verification_statuses lookup the owner seeded on 2026-08-07
-- (pending/verified/rejected/suspended). The lookup is the source of truth: rename 'approved'
-- to 'verified' and add 'suspended'. No educator rows existed when this ran (checked with count(*)).
-- educator_directory stores the enum value by OID, so its filter follows the rename.

ALTER TYPE public.educator_verification_status RENAME VALUE 'approved' TO 'verified';
ALTER TYPE public.educator_verification_status ADD VALUE IF NOT EXISTS 'suspended';
