# Specification: Authentication System

## 1. What
Implement a secure authentication system allowing users to sign up, log in, and log out as either a Parent or a Tutor, connecting the frontend UI to Supabase Auth.

## 2. Why
To provide personalized experiences, allow tutors to be listed in the directory, and allow parents to book sessions, users must have secure, authenticated accounts on the platform.

## 3. Requirements
- Integrate `@supabase/supabase-js` into the Next.js application.
- Wire up the existing Multi-step Signup Modal:
  - Step 1: Collect Name, Email, Password -> Create user in Supabase Auth.
  - Step 2: Role selection (Parent/Tutor).
  - Step 3 (Parent): Collect Parent specific data -> Insert into `profiles`.
  - Step 3 (Tutor): Collect Tutor specific data -> Insert into `profiles` and `tutor_details`.
- Wire up the Login Modal to authenticate users via email/password.
- Implement session management (saving session in cookies/local storage) to persist login state across page reloads.
- Update UI headers to reflect logged-in state (e.g., show "My Dashboard" and "Logout" instead of "Login/Signup").

## 4. Technical Details
- Use Supabase Auth `signUp` and `signInWithPassword` methods.
- Because signup is multi-step, user creation in Supabase Auth should ideally happen at the very end of the flow, or use a Supabase Database Trigger (Function) to automatically create a `profiles` row upon Auth user creation, which the frontend then updates with the form details.
- Handle authentication errors gracefully (e.g., "Email already in use", "Weak password") and display them in the UI.

## 5. Acceptance Criteria
- [ ] User can successfully complete the multi-step signup as a Parent.
- [ ] User can successfully complete the multi-step signup as a Tutor.
- [ ] Data is correctly inserted into Supabase Auth and the corresponding Postgres tables.
- [ ] User can log in with their credentials.
- [ ] User can log out.
- [ ] Navbar updates to show user state.
