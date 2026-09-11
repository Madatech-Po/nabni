# Nabni System Architecture

This document defines the overarching architectural decisions, structure, and integrations for the Nabni platform.

---

## 1. Folder Structure
The codebase follows a highly modular, feature-based structure to separate concerns and ensure maintainability as the project scales.

```text
/src
  /app                  # Next.js App Router (Pages, Layouts, API Routes)
  /components           # Reusable UI components (MUI based)
    /common             # Generic UI (Buttons, Spinners)
    /layout             # Navbar, Footer, Sidebars
    /features           # Complex, feature-specific components
  /hooks                # Custom React hooks (e.g., useAuth)
  /services             # Supabase abstraction layer (Database queries)
  /contexts             # React Context Providers (Theme, Auth, Snackbar)
  /lib                  # External library configurations (e.g., Supabase client)
  /utils                # Pure helper functions (e.g., formatting)
  /types                # Global TypeScript definitions & auto-generated DB types
```

---

## 2. Routing Structure
The application utilizes the **Next.js App Router** with file-system-based routing.

*   **Route Groups:** Used to organize layouts without affecting the URL path.
    *   `/(public)`: Landing page, `/tutors` directory.
    *   `/(auth)`: `/login`, `/register`.
    *   `/(dashboard)`: Contains role-specific dashboards (`/teacher`, `/parent`, `/admin`).
*   **Protection (Middleware):** A `middleware.ts` file runs before a request is completed to verify the user's Supabase session. It handles redirects (e.g., pushing unauthenticated users away from `/dashboard` and routing authenticated users based on their role).

---

## 3. Supabase Integration
Supabase serves as the primary Backend-as-a-Service (BaaS).

*   **Client Instantiation:** The `@supabase/ssr` package is used to create secure clients for Server Components, Client Components, and Middleware.
*   **Type Safety:** `supabase-js` is paired with auto-generated TypeScript definitions (`database.types.ts`) to ensure end-to-end type safety for all queries.
*   **Security (RLS):** Database queries are executed directly from the client or server. Security is entirely enforced at the database level via PostgreSQL Row Level Security (RLS) policies, verifying the `auth.uid()` against the row owner.

---

## 4. State Management
To avoid performance bottlenecks and prop-drilling, state is strictly categorized:

*   **Server State (Remote Data):** 
    *   Public data is fetched on the server using React Server Components (RSC) for SEO.
    *   Dynamic/Private data is fetched on the client using **SWR** (or React Query) to handle caching, revalidation, and loading states automatically.
*   **Global UI State:** Kept minimal. Handled via **React Context** (e.g., Theme mode, User Session, Global Snackbar state).
*   **Local State:** Component-specific state handled via `useState` and `useReducer` (e.g., controlling a modal's `open` prop or tracking form inputs).

---

## 5. Component Hierarchy
UI construction follows an atomic/compositional hierarchy:

1.  **Layouts (`layout.tsx`):** Wraps the entire route segment. Manages persistent UI like Navbars and Sidebars.
2.  **Pages (`page.tsx`):** The entry point for a route. Responsible for server-side data fetching and passing data to features.
3.  **Features (e.g., `<OfferDashboard />`):** Domain-specific components that contain business logic and connect to data services.
4.  **Core Components (e.g., `<ProfileCard />`):** Reusable, purely presentational components that accept props and emit events.
5.  **MUI Primitives (e.g., `<Button>`, `<Typography>`):** The lowest level building blocks.

---

## 6. Data Flow
A typical user interaction (e.g., Teacher submitting an offer):

1.  **Interaction:** User fills out a form and clicks "Submit" in a Client Component.
2.  **Service Layer:** The component calls an abstraction function in `/services/offers.ts`.
3.  **Supabase Client:** The service uses the Supabase SDK to send an `INSERT` request to the database.
4.  **Database Validation:** PostgreSQL evaluates the RLS policies and table constraints.
5.  **Side Effects:** A Database Trigger may fire asynchronously (e.g., generating a notification record).
6.  **Response:** The client receives a success response, updates the UI (via optimistic updates or invalidating the SWR cache), and displays a success Snackbar.

---

## 7. Error Handling
*   **Global Boundaries:** Next.js `error.tsx` files are placed at route segments to catch render/server errors and display a fallback UI, preventing full application crashes.
*   **API/Database Errors:** Caught within the `/services` layer. They are translated into user-friendly messages and surfaced to the UI via a global Snackbar context.
*   **Form Errors:** Handled locally within forms (using Zod or manual validation) providing instant feedback below the specific input fields.

---

## 8. Environment Variables
The application relies on specific environment variables defined in `.env.local` for local development and securely stored in the deployment platform for production.

*   `NEXT_PUBLIC_SUPABASE_URL`: The URL of the Supabase project.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The anonymous public key for client-side API requests.
*   `SUPABASE_SERVICE_ROLE_KEY`: (Server-side only) Used for administrative bypasses (e.g., within Edge Functions or specific API routes), never exposed to the client.

---

## 9. Deployment Strategy
*   **Frontend (Next.js):** Deployed on **Vercel** to take advantage of Edge networking, automatic Server-Side Rendering capabilities, and seamless CI/CD from the GitHub repository.
*   **Backend (Supabase):** Managed by **Supabase Cloud**. This provides automated backups, managed Postgres scaling, connection pooling (PgBouncer), and edge functions.
*   **CI/CD Pipeline:** GitHub Actions runs TypeScript type-checking and automated tests on every Pull Request before allowing a merge to the `main` branch.
