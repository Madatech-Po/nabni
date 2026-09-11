# Nabni Product Backlog & Project Status Review

## 1. Current Project Status Review
Below is an assessment of every feature currently present in the codebase.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Landing Page UI (Hero & Layout)** | ✅ Completed | Fully styled, responsive, matches design requirements. |
| **Dark Mode Toggle** | ✅ Completed | Works perfectly, saves user preference in `localStorage`. |
| **Mobile Navigation Menu** | ✅ Completed | Slide-out menu works with smooth animations. |
| **Custom Searchable Dropdowns** | ✅ Completed | UI component works perfectly for filtering large lists. |
| **Multi-step Signup UI** | 🚧 Partially Implemented | Form logic, validation, and steps work perfectly in the browser. Needs backend integration. |
| **Login Modal UI** | 🚧 Partially Implemented | Modal opens and closes. Needs backend authentication. |
| **Tutor Profile Modal UI** | 🚧 Partially Implemented | Beautiful UI is implemented, but displays hardcoded static data. |
| **Newsletter Subscription UI** | 🚧 Partially Implemented | Shows a toast notification on submit, but doesn't save the email anywhere. |

---

## 2. Missing MVP Features (Product Backlog)
These are the critical features required to launch the Minimum Viable Product, all of which are currently in the **Not Started** phase.

| MVP Feature | Status | Description | Priority |
| :--- | :--- | :--- | :--- |
| **Tech Stack Migration** | ❌ Not Started | Port the vanilla HTML/JS code into Next.js (React) to manage state cleanly and enable routing. | 🔴 Critical |
| **Supabase Setup & Schema** | ❌ Not Started | Initialize Supabase. Create PostgreSQL tables for `users`, `profiles`, `tutors`, `governorates`, `subjects`. | 🔴 Critical |
| **Authentication Integration** | ❌ Not Started | Wire the existing Login/Signup UI to Supabase Auth so parents and tutors can actually create accounts. | 🔴 Critical |
| **Dynamic Data Fetching** | ❌ Not Started | Replace the hardcoded Javascript arrays for governorates and subjects with dynamic data fetched from Supabase. | 🟠 High |
| **Tutor Directory Page** | ❌ Not Started | Create a dedicated page (`/tutors`) that queries the database and lists all approved tutors with filtering. | 🟠 High |
| **Public Tutor Profile Pages** | ❌ Not Started | Create dynamic URL routes (e.g., `/tutor/123`) to show individual tutor data, moving away from just a modal. | 🟠 High |
| **Data Persistence (Submitting forms)** | ❌ Not Started | When a user completes their profile, actually insert their details, bio, and pricing into the database. | 🔴 Critical |

---

## 3. Future Roadmap (Post-MVP)

### Version 1.1 Features
- **User Dashboard** (❌ Not Started): Private area for tutors to edit profiles and parents to see saved tutors.
- **Trial Booking System** (❌ Not Started): Allow parents to click "Book" and notify the tutor.
- **Admin Panel** (❌ Not Started): Interface for admins to approve/reject tutors.

### Version 2.0 Features
- **In-platform Messaging** (❌ Not Started): Real-time chat between parents and tutors.
- **Payment Gateway** (❌ Not Started): Online payment for sessions.
- **Review System** (❌ Not Started): 5-star ratings and written reviews after sessions.
