# Frontend Architecture Specification

## Business Goal
Establish a robust, scalable, and maintainable foundation for the Nabni platform's frontend. A well-defined architecture ensures that as the codebase grows with new features (e.g., Messaging, Payments), it remains performant, easy to navigate for developers, and resilient to bugs.

## Architecture & Tech Stack
- **Framework:** Next.js (App Router) - chosen for its superior Server-Side Rendering (SSR) capabilities, crucial for the SEO of the public Tutor Directory.
- **Language:** TypeScript (Strict mode enabled to catch errors at compile time).
- **UI Library:** Material UI (MUI v7) with Emotion (configured to support Next.js SSR).
- **Backend as a Service:** Supabase (Auth, Postgres DB, Storage, Realtime).

---

## 1. Directory Structure
The codebase will follow a feature-based and highly modular structure to separate concerns:

```text
/src
  /app                  # Next.js App Router (Pages, Layouts, Loading, Error UI)
    /(public)           # Route group: Landing page, Tutor Directory
    /(auth)             # Route group: Login, Signup, Forgot Password
    /(dashboard)        # Route group: Admin, Teacher, and Parent dashboards
  /components           # Reusable UI components (Defined in design-system.md)
  /hooks                # Custom React hooks (e.g., useAuth, useDebounce)
  /services             # Supabase abstraction layer (Database queries)
  /types                # Global TypeScript interfaces (Database types generated from Supabase)
  /utils                # Pure helper functions (e.g., formatDate, formatCurrency)
  /contexts             # React Context Providers (Theme, Auth, Snackbar)
```

---

## 2. State Management Strategy
To avoid "prop drilling" and ensure high performance, state is categorized and managed accordingly:

- **Server State (Data Fetching):**
  - **Public Data:** Fetched directly on the server using React Server Components (RSC) for SEO and fast initial load (e.g., the Tutor Directory).
  - **Private/Dynamic Data:** Fetched on the client using SWR or React Query to handle caching, background revalidation, and loading states (e.g., the Teacher's active request feed).
- **Global UI State:**
  - Kept to a minimum. Handled via React Context.
  - Examples: Auth Session state, Theme toggle (Light/Dark), and global Toast/Snackbar notifications.
- **Local UI State:**
  - Handled via `useState` or `useReducer`.
  - Examples: Form inputs, modal open/close states, active tab selection.

---

## 3. Routing & Security
- **Next.js App Router:** Utilizes file-system routing.
- **Route Protection:** 
  - A Next.js Middleware (`middleware.ts`) will intercept requests. 
  - Unauthenticated users attempting to access `/parent/*` or `/teacher/*` are redirected to `/login`.
  - Authenticated users attempting to access `/login` are redirected to their respective dashboard.
- **Role-Based Access Control (RBAC):** Middleware and Layouts will check the user's role. A Parent cannot access the Teacher dashboard URL, and vice versa.

---

## 4. Supabase Integration Layer
Direct Supabase calls inside UI components create brittle code. All database interactions must be abstracted into the `/services` folder.

- **Example Pattern:**
  Instead of writing `supabase.from('requests').select('*')` inside a component, the component calls a custom hook or service function: `const { data } = useOpenRequests(filters);`.
- **Type Safety:** The project will utilize Supabase CLI to auto-generate TypeScript definitions (`database.types.ts`), ensuring every DB call is strictly typed.

---

## 5. Form Handling & Validation
- **Complex Forms:** (e.g., The multi-step Teacher Registration) will use libraries like `react-hook-form` paired with `zod` for schema validation.
- **Simpler Forms:** Can rely on standard React controlled components, ensuring instant feedback on validation (e.g., verifying the 11-digit Egyptian phone number).

---

## 6. Performance Optimization
- **Image Optimization:** All user avatars and static assets must use the `next/image` component to automatically serve WebP formats and handle lazy loading.
- **Code Splitting:** Heavy components (like future charting libraries for the Admin Dashboard) must be dynamically imported (`next/dynamic`) so they don't block the initial page load.
- **Debouncing:** Search inputs (e.g., searching for a teacher by name) must be debounced to prevent spamming the Supabase database with queries on every keystroke.

---

## 7. Error Handling & Logging
- **Global Boundaries:** Next.js `error.tsx` files placed at route segments to catch render errors and display a friendly fallback UI rather than a blank white screen.
- **API Errors:** Supabase errors must be caught in the service layer and surfaced to the UI via a global Snackbar context (e.g., "Failed to submit offer, please try again").
- **Console Warnings:** Ensure the production build contains zero React warnings (e.g., missing keys in lists, unhandled promises).

---

## 8. Testing Strategy (Future Proofing)
- **Unit Tests:** `Vitest` or `Jest` for pure functions in `/utils` and complex custom hooks in `/hooks`.
- **Component Tests:** `React Testing Library` to verify rendering and interaction of complex UI elements (like the Acceptance Modal).
- **End-to-End (E2E):** `Playwright` to test critical user journeys in a real browser environment:
  1. Parent logs in -> Posts a request -> Sees it in the dashboard.
  2. Teacher logs in -> Submits an offer -> Offer appears as pending.
