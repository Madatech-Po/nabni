# Nabni MVP Specification (Spec Kit)

## 1. Business Goal
To build a reliable and scalable educational marketplace in Egypt that connects parents with qualified foundation (Ta'sees) teachers. The platform aims to streamline the process of finding, requesting, and hiring educators based on specific needs such as location, subject, teaching method, and budget. Furthermore, it aims to provide administrators with complete visibility and control over the platform to ensure quality, trust, and operational efficiency.

## 2. User Personas
*   **The Parent (ولي الأمر):** A busy parent seeking a specialized foundation teacher to help their child improve academically. They want a simple way to post their requirements and choose from qualified applicants based on price and reputation.
*   **The Teacher (مدرس التأسيس):** An educator looking for new students. They want to showcase their experience, browse available teaching requests in their area or online, and submit competitive offers.
*   **The Administrator (المشرف):** Platform operator (Super Admin, Support, etc.) responsible for maintaining quality, handling disputes, overseeing platform activity, and verifying teacher profiles.

## 3. User Stories
*   **As a Teacher**, I want to create an account and complete my professional profile (bio, subjects, locations, experience), so that parents can see my qualifications.
*   **As a Teacher**, I want to withdraw my offer if I am no longer available, so I don't get booked when I can't teach.
*   **As a Parent**, I want to publish a detailed teaching request (grade, subject, budget, location, preferred method), so that available teachers can apply.
*   **As a Parent**, I want to edit, cancel, or deactivate my request if my needs change.
*   **As a Parent**, I want to view, compare, accept, or reject offers received from teachers, so I can choose the best fit for my child.
*   **As a User (Parent/Teacher)**, I want to view the contact details (phone number) of the other party *only after* an offer is accepted to coordinate the first session securely.
*   **As a User (Parent/Teacher)**, I want to rate the other party after the engagement starts, so I can share my experience.
*   **As an Administrator**, I want to review and approve teacher profiles before they become public, ensuring platform safety.
*   **As an Administrator**, I want a comprehensive dashboard to view KPIs, manage users, and moderate requests/offers.

## 4. Functional Requirements
*   **Authentication:** Users can sign up, log in, and log out using Supabase Auth (Email/Password).
*   **Role Management:** The system must distinguish between Parents, Teachers, and Admins.
*   **Teacher Profile Completion:** Teachers must fill in mandatory fields. Profiles remain "Inactive" until all mandatory fields are provided AND an Admin approves the profile.
*   **Request Management (Parent):** Parents can create a request. They can also cancel or edit it.
*   **Offer Submission (Teacher):** Teachers can view active requests and submit an offer (price, schedule).
*   **Offer Management (Parent):** Parents have a dashboard to view all offers per request. They can accept exactly one offer.
*   **Contact Sharing Workflow:** Phone numbers are strictly hidden from public profiles and requests. They are revealed to both the parent and the specific teacher only when an offer is explicitly accepted.
*   **Rating System:** Both parties can leave a 1-5 star rating and comment, *only* if they have a historically accepted request together.

## 5. Non-Functional Requirements
*   **Interface:** Arabic-first interface (RTL formatting) with responsive UI (Mobile, Tablet, Desktop).
*   **Architecture:** Scalable, utilizing Supabase PostgreSQL, Auth, and Storage.
*   **Security:** Row Level Security (RLS) must be strictly enforced so users can only see their own private data and offers relevant to them.

## 6. Acceptance Criteria
*   [ ] A teacher cannot submit an offer if their profile is marked as incomplete or is pending Admin approval (`is_approved = false`).
*   [ ] A teacher cannot see offers submitted by *other* teachers on the same request (Blind Bidding).
*   [ ] A parent can successfully publish a request and it immediately appears in the teacher feed.
*   [ ] When a parent accepts an offer, the parent request status automatically changes to "Closed/Assigned", preventing further offers, and any pending offers are marked as rejected.
*   [ ] When a request is deleted/cancelled by a parent, all pending offers attached to it are archived.
*   [ ] Ratings can only be submitted if an accepted offer exists linking the Parent and the Teacher.
*   [ ] Phone numbers are only visible between users with an accepted request connection.

## 7. Business Rules & Validations
*   **Phone Validation:** Must match the Egyptian mobile format (11 digits, starts with 01).
*   **Age Validation:** Student age must be within a logical foundation range (e.g., 3-15 years).
*   **Budget Validation:** Minimum realistic values must be enforced to prevent spam.
*   **Description Validation:** Request descriptions must have a minimum character count (e.g., 50 characters) to provide teachers with enough context.
*   **Offer Freeze:** If a teacher submits an offer, the offer snapshot retains the pricing/context even if the teacher later updates their global profile.

## 8. Admin Dashboard Specification
### 8.1 Dashboard Overview
Display platform KPIs including:
- Total registered teachers & parents.
- Total active & completed requests.
- Total accepted & pending offers.
- New users today & New requests today.
- Average teacher rating & Average parent rating.

### 8.2 User Management
- **Teacher Management:** View all, Search, Filter, View profile, Activate (Approve), Suspend, Delete, View submitted offers, View ratings, View activity history.
- **Parent Management:** View all, Search, View profile, Suspend account, Activate account, Delete account, View requests, View ratings.

### 8.3 Content Moderation
- **Teaching Requests Management:** View all, Filter, View details, Close requests, Reopen requests, Remove inappropriate requests.
- **Teacher Offers Management:** View all, View accepted/pending, Remove inappropriate offers.
- **Rating Management:** View all ratings, Review reported ratings, Remove abusive reviews.

### 8.4 Reports & Analytics
Provide charts for:
- Daily registrations, requests, and accepted offers.
- Teacher/Parent growth.
- Most requested subjects, grades, and active governorates.

### 8.5 Search, Filtering, and Auditing
- **Search:** Allow searching by Name, Phone, Governorate, Subject, Status, Registration date.
- **Audit Log:** Track administrator activities (Login, User updates, Account suspension/activation, Deletions).

### 8.6 Permissions
Support role-based permissions: Super Admin, Operations Admin, Customer Support, Read Only Admin.

## 9. Edge Cases
*   **Concurrency:** Two teachers submit an offer at the exact same millisecond.
*   **Request Deletion during Bidding:** A parent deletes a request while a teacher is typing an offer.
*   **Ghosting:** A parent accepts an offer, but the teacher becomes unresponsive (requires a mechanism for the parent to cancel an accepted offer and reopen the request).

## 10. Technical Considerations
*   **Frontend:** Migrate to Next.js (React) to handle complex state management for dashboards and feeds securely.
*   **Database RLS:** Utilize Supabase RLS policies rigorously to ensure blind bidding and contact privacy.

## 11. Database Entities (High Level)
*   **`users`** (Supabase Auth)
*   **`profiles`**: `id`, `role`, `first_name`, `last_name`, `phone`, `avatar_url`, `is_active`.
*   **`teacher_details`**: `profile_id`, `bio`, `experience`, `hourly_rate`, `is_approved`.
*   **`requests`**: `id`, `parent_id`, `grade`, `subject`, `description`, `budget`, `status` (open, closed, cancelled).
*   **`offers`**: `id`, `request_id`, `teacher_id`, `price`, `notes`, `schedule`, `status` (pending, accepted, rejected, withdrawn).
*   **`ratings`**: `id`, `request_id`, `reviewer_id`, `reviewee_id`, `stars`, `comment`.
*   **`admin_logs`**: `id`, `admin_id`, `action_type`, `target_id`, `details`, `timestamp`.

## 12. API Requirements (High Level)
Handled via Supabase PostgREST:
*   `GET /requests` (Filtered for approved teachers)
*   `POST /requests`, `PATCH /requests`
*   `POST /offers`, `PATCH /offers` (Accept/Reject/Withdraw)
*   `PATCH /profiles/:id` (Admin approval endpoints)

## 13. Future Enhancements (Outside MVP)
*   In-App Messaging (Chat).
*   Online Payments (Paymob/Fawry).
*   Video Integration for online teaching.
