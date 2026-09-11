# Specification: Supabase Setup & Database Schema

## 1. What
Initialize a Supabase project and establish the foundational relational database schema using PostgreSQL to support users, profiles, and platform configuration data.

## 2. Why
Nabni needs a secure, scalable backend database to store user credentials, tutor profiles, and dynamic platform data. Supabase provides an open-source Firebase alternative with a robust Postgres database, built-in Auth, and auto-generated APIs.

## 3. Requirements
- Create a new Supabase project.
- Define SQL schema for the following tables:
  - `users` (managed by Supabase Auth).
  - `profiles`: Extends the auth user with `id` (UUID foreign key), `role` (enum: 'parent', 'tutor', 'admin'), `first_name`, `last_name`, `phone`.
  - `tutor_details`: `id` (UUID foreign key to profiles), `governorate`, `region`, `subject`, `experience_years`, `bio`, `hourly_rate`, `is_approved`.
  - `tutor_stages`: Junction table linking tutors to educational stages (KG, Primary, etc.).
  - `tutor_specializations`: Junction table linking tutors to specific skill specializations.
  - `governorates`: Lookup table for Egyptian governorates.
  - `subjects`: Lookup table for available teaching subjects.
- Configure Row Level Security (RLS) policies.

## 4. Technical Details
- Use Supabase SQL Editor to run migration scripts.
- RLS Policies:
  - `profiles`: Users can read/update their own profile. Public can read tutor profiles.
  - `tutor_details`: Public can read approved tutors. Tutors can update their own details.
  - Lookup tables (`governorates`, `subjects`): Public read-only.

## 5. Acceptance Criteria
- [ ] Supabase project is successfully provisioned.
- [ ] Database tables are created with correct primary/foreign key relationships.
- [ ] RLS policies prevent unauthorized modification of other users' profiles.
- [ ] Lookup tables are seeded with initial data (Egypt governorates, basic subjects).
