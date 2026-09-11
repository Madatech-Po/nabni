# Nabni Project Analysis

## Project Architecture
The project is currently a traditional static frontend web application. It uses a single-page or multi-page approach without a modern JavaScript framework (like React, Vue, or Angular) or bundler. State management and DOM manipulation are handled entirely via Vanilla JavaScript. 

## Folder Structure
- `index.html`: The main landing page. It contains the navigation, hero section, modals (login, signup, tutor profile), and inline Tailwind configuration.
- `app.js`: The central JavaScript file (400+ lines) responsible for all interactive UI logic, including dark mode toggling, mobile menu handling, custom searchable dropdowns, modal visibility, and multi-step form validation.
- `parent-registration.html`: A standalone page for parent registration (potentially a mockup or alternative flow to the modal-based registration).
- `style.css`: Contains custom CSS styles, animations, and specific class overrides not handled directly by Tailwind utility classes.

## Tech Stack
- **Structure**: HTML5
- **Styling**: Tailwind CSS (loaded via CDN)
- **Logic**: Vanilla JavaScript
- **Icons**: Font Awesome 6 (loaded via CDN)
- **Fonts**: Google Fonts (Cairo)

## Existing Features
- **Responsive Layout**: Navigation bar with a sliding mobile side-menu.
- **Dark Mode**: Toggleable dark mode with state saved in `localStorage` and system preference detection.
- **Interactive UI Components**: 
  - Custom select dropdowns with search filtering.
  - Floating toast notifications (used currently for the newsletter).
  - Modal system with slide-up animations and backdrop blur.
- **Multi-step Registration Flow**: A comprehensive signup modal that forks into "Parent" or "Tutor" paths, collecting specific information based on the chosen role, with required field validation.
- **Tutor Profile Viewer**: A modal UI to view a tutor's details, pricing, experience, and book a trial session.

## Completed Modules
- Landing page UI (Hero section, header, social proof).
- Complex UI form controls (Searchable dropdowns, selectable interest chips).
- Multi-step frontend registration wizard.
- Theme management (Dark/Light mode).

## Incomplete Modules
- **Authentication System**: UI exists, but no backend integration.
- **Tutor Directory/Search**: The UI has buttons to "Search for Tutor", but there is no search results page or filtering logic yet.
- **Booking System**: The "Book a trial session" button in the tutor profile is just a UI placeholder.
- **User Dashboard**: No post-login experience exists for either parents or tutors.

## Missing Functionality
- Actual backend API communication.
- Database connection to fetch dynamic data (currently, governorates, subjects, and stages are hardcoded arrays in `app.js`).
- State persistence across sessions (other than the dark mode theme).
- Proper form submission processing (data is not sent anywhere).

## Technical Debt & Code Quality Observations
- **Lack of a Framework/Bundler**: Managing complex state (like a multi-step form with dynamic fields and validation) with Vanilla JS in `app.js` is already leading to a large, imperative codebase. This will become difficult to maintain as features scale.
- **Inline Tailwind Config**: Tailwind is loaded via CDN with an inline `<script>` configuration. While fine for prototyping, this is not performant or suitable for production. It lacks tree-shaking and custom CSS compilation.
- **Hardcoded Data**: Lists of governorates, subjects, and educational stages are hardcoded directly into the JavaScript file.
- **Feedback Mechanisms**: The signup success feedback relies on a native browser `alert()` rather than a custom integrated UI modal/toast.
- **Code Duplication**: There's significant HTML duplication (e.g., SVG icons, modal structures) that could be avoided by using reusable components.

## Supabase Integration Status
**Not Integrated.** There is no evidence of the Supabase SDK being included or used anywhere in the codebase.

## Authentication Flow
Currently, the authentication flow is a **frontend-only mockup**:
1. User clicks "Create Account".
2. Fills out Step 1 (Name, Email, Password).
3. Selects Role (Parent or Tutor).
4. Fills out role-specific forms.
5. Upon submission, `app.js` runs a local validation function.
6. If valid, it fires an `alert('تم إنشاء الحساب بنجاح!');` (Account created successfully).
7. The modal closes and the form resets. 
*No data is sent over the network, and no user session is created.*

## Database Usage
**None.** All data is currently mocked and hardcoded directly into the frontend files.

## Suggested Next Priorities
1. **Tech Stack Migration (Highly Recommended)**: Before building further, strongly consider migrating the project to a modern framework like Next.js, React, or Vue. This will solve the technical debt regarding state management, component reusability, and Tailwind compilation.
2. **Backend/Database Integration**: Initialize a Supabase project and connect it to the application.
3. **Database Schema Design**: Design tables for `Users` (distinguishing between Parents and Tutors), `Subjects`, `Governorates`, and `Tutor_Specializations`.
4. **Implement Real Authentication**: Wire up the existing Login and Signup UI to Supabase Auth.
5. **Dynamic Data Fetching**: Replace the hardcoded arrays in `app.js` with API calls to Supabase to fetch governorates and subjects.
6. **Improve UI Feedback**: Replace native `alert()` dialogs with custom success modals or the existing toast notification system.
