# Specification: Tech Stack Migration (Next.js)

## 1. Overview
**Status:** ❌ Not Started | **Priority:** 🔴 Critical (Highest)

This specification details the process of migrating the Nabni platform from its current prototype state (Static HTML, Vanilla JavaScript, CDN-based Tailwind CSS) to a modern, scalable architecture using **Next.js (App Router)** and **React**.

## 2. Why is this necessary?
The current `app.js` handles complex multi-step form validation, modal state management, dropdown filtering, and theme toggling using imperative DOM manipulation. As the platform prepares to integrate a real backend (Supabase) and add new features (Tutor Directory, Dashboards), maintaining state via Vanilla JS will result in brittle, buggy, and unmaintainable code. Moving to Next.js provides:
*   **Declarative UI:** React state handles form inputs and modal visibility elegantly.
*   **Componentization:** Reusable UI components (Nav, Modals, Inputs) eliminate HTML duplication.
*   **Routing:** File-system based routing for directories and tutor profiles.
*   **Performance & SEO:** Native Tailwind processing and Server-Side Rendering (SSR).

## 3. Product Requirements
1.  **Framework:** Initialize a Next.js application using the App Router (`app/` directory).
2.  **Styling:** Configure Tailwind CSS locally (remove the CDN script). Ensure all custom colors (`primary`, `primaryHover`, `darkBg`, `lightBg`, `cardBg`) and `style.css` animations are ported to `tailwind.config.ts` or `globals.css`.
3.  **UI Fidelity:** The migrated React application must look visually identical to the original static HTML prototype. All responsive breakpoints and hover effects must be preserved.
4.  **Functionality Preservation:** 
    *   Dark Mode toggle must work and persist across reloads.
    *   Mobile side-menu must slide in/out correctly.
    *   Custom searchable dropdowns must function exactly as they do now.
    *   The multi-step registration modal must retain its step-by-step logic and validation without breaking.
5.  **Icons & Fonts:** Replace FontAwesome CDN with `@fortawesome/react-fontawesome` (or `lucide-react` if permitted). Use `next/font/google` for the Cairo font.

## 4. Technical Architecture Plan

### 4.1 Folder Structure
```text
/app
  layout.tsx          (Global HTML, Body, Providers, Cairo Font)
  page.tsx            (Landing Page content)
  globals.css         (Tailwind directives and custom CSS)
/components
  /ui                 (Reusable generic components)
    Button.tsx
    Dropdown.tsx      (Searchable dropdown logic)
    Modal.tsx         (Base modal wrapper)
  /layout             (Page layout components)
    Navbar.tsx        (Includes theme toggle and mobile menu)
    Footer.tsx
  /features           (Complex feature components)
    AuthModals.tsx    (Login and Multi-step Signup logic)
    Hero.tsx          (Landing page hero section)
```

### 4.2 State Management
*   **Modals:** Use a global state provider (e.g., React Context or Zustand) or localized `useState` in the layout to manage which modal (Login, Signup, Profile) is open.
*   **Theme:** Use `next-themes` to handle the Dark/Light mode toggle and system preference detection safely without hydration mismatches.
*   **Forms:** Use standard React controlled components (`useState` for form fields) to handle the multi-step signup validation before submission.

### 4.3 Component Breakdown Steps
1.  **Layout Setup:** Configure `layout.tsx` with the Cairo font, Tailwind imports, and NextThemes Provider.
2.  **Static Conversion:** Convert the Navbar, Hero, and Footer HTML sections into stateless React components.
3.  **Interactive Conversion:** 
    *   Convert the Mobile Menu logic into a React component with an `isOpen` state.
    *   Convert the searchable custom dropdown into a `<SearchableSelect />` component that accepts `options` as a prop.
4.  **Complex Forms:** Port the `app.js` multi-step validation logic into a `<SignupWizard />` component that manages a `step` state (1, 2, 3) and holds form data in a single object state.

## 5. Acceptance Criteria
*   [ ] `npm run dev` successfully compiles and serves the application on `localhost:3000`.
*   [ ] Running a lighthouse audit confirms no missing CSS or broken layouts compared to the prototype.
*   [ ] The dark mode toggle successfully applies the `.dark` class to the HTML tag.
*   [ ] The multi-step registration form validates empty fields and allows a user to progress from Step 1 to Step 3 seamlessly.
*   [ ] The source code contains zero `document.getElementById` or `document.querySelector` calls (all DOM manipulation is handled by React).
