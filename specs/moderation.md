# Moderation Specification (Trust & Safety)

## Business Goal
Ensure a safe, trustworthy, and high-quality educational environment. Since the platform connects parents and children with independent educators, strict moderation of profiles, requests, and communication is vital to protect users and maintain brand reputation.

## User Stories
- As an Administrator, I want to review newly registered teacher profiles before they are publicly visible, so I can verify their credentials or identity and ensure quality.
- As an Administrator, I want to be able to suspend a user (Parent or Teacher) who violates platform policies, preventing them from interacting with others.
- As a Parent or Teacher, I want to be able to report abusive profiles, offers, or requests, so the administration can take action against spam or harassment.
- As an Administrator, I want to review and remove inappropriate reviews or cancel suspicious teaching requests.

## Functional Requirements

### 1. Teacher Verification Workflow
- **Pending Queue:** A dedicated section in the Admin Dashboard listing all teacher profiles that have completed their mandatory fields but are awaiting approval (`is_approved = false`).
- **Approval Action:** Admins review the provided data (bio, subjects, avatar) and click "Approve" (sets `is_approved = true`).
- **Rejection Action:** Admins can reject a profile, optionally providing a reason, which sets the profile back to an incomplete status and notifies the teacher to fix the issues.

### 2. User Suspension
- Admins can change a user's status to `suspended`.
- A suspended user is either entirely blocked from logging in via Supabase Auth, or their RLS policies are restricted so they can only read data but cannot create requests, submit offers, or send messages.

### 3. Content Flagging (Reporting)
- **Report Button:** A standardized "Report" flag visible on Tutor Profiles, Public Requests, Offers, and Reviews.
- **Report Queue:** Admins see a prioritized queue of reported items, including the reporter's ID, the reason, and the targeted content.
- **Resolution:** Admins can choose to "Delete Content", "Suspend User", or "Dismiss Report".

### 4. Audit Logging
- Every destructive or state-changing action taken by an admin (Approving a teacher, deleting a request, suspending a user) is automatically logged in an `admin_logs` table for accountability.

## Non-Functional Requirements
- **Security & Access Control:** Moderation APIs and Dashboard routes must be strictly protected. Only authenticated users with an explicit `admin` role in their profile can access these endpoints.
- **Automation (Future):** Implement automated profanity filters for bios, requests, and reviews to reduce the manual moderation load.

## Validations & Business Rules (RLS)
- **Visibility:** Teachers with `is_approved = false` or `status = suspended` are completely hidden from the public Tutor Directory and cannot view the Request Feed.
- **Self-Moderation Prevented:** An Admin cannot suspend their own account.

## Acceptance Criteria
- [ ] A newly registered teacher who finishes their profile receives a "Pending Verification" message and does not appear in search results.
- [ ] When an Admin approves the teacher, the teacher receives an automated notification (Email/In-app) and immediately becomes visible in the public directory.
- [ ] An Admin can successfully click a "Suspend" button on a user, instantly revoking their ability to post new requests or offers.
- [ ] All admin moderation actions are successfully recorded in the database audit log.
