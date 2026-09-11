# Admin Dashboard Specification

## Business Goal
Provide administrators with complete visibility and control over the platform to ensure quality, trust, and operational efficiency.

## User Stories
- As an Administrator, I want to view KPIs to understand platform growth.
- As an Administrator, I want to approve, suspend, or delete users to maintain platform safety.
- As an Administrator, I want to moderate requests and offers to remove abusive content.

## Functional Requirements

### Dashboard Overview
Display KPIs: Total registered teachers/parents, active/completed requests, accepted/pending offers, new users/requests today, average ratings.

### Teacher Management
- View all, Search, Filter.
- View profile.
- **Activate teacher** (Crucial for allowing new teachers to use the platform).
- Suspend/Delete teacher.
- View their offers, ratings, and activity history.

### Parent Management
- View all, Search.
- Suspend/Activate/Delete account.
- View requests and ratings.

### Content Moderation
- **Requests:** View all, Filter, Close/Reopen, Remove inappropriate requests.
- **Offers:** View all, Remove inappropriate offers.
- **Ratings:** View all, Review reported ratings, Remove abusive reviews.

### Reports & Analytics
- Charts for: Daily registrations, Daily requests, Daily accepted offers, User growth, Most requested subjects/grades/governorates.

### Audit Log & Permissions
- Track actions: Login, User updates, Account suspension/activation, Content deletion.
- Roles: Super Admin, Operations Admin, Customer Support, Read Only Admin.

## Acceptance Criteria
- [ ] Admins can successfully change a teacher's `is_approved` status from false to true.
- [ ] Admins can view a paginated list of all users and content.
- [ ] Administrative actions are logged in an `admin_logs` table.
