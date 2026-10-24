# Nabni Product Backlog & Project Status

_Last updated: 2026-10-24 (Sprint 2). Work is tracked in Jira project **NAB**; this file is the overview._

## 1. Built and live on `main`

| Area | What works | Jira |
| :--- | :--- | :--- |
| **Platform** | Next.js 14 (App Router) + MUI 5 with RTL Arabic UI, migrated from the HTML prototype. | Foundation (NAB-1) |
| **Database** | Supabase Postgres; the live schema is the source of truth (`supabase/migrations/000_baseline.sql` onward). Lookup tables seeded: governorates, service categories, education levels, teaching places, pricing units. Row-level security on every table. | NAB-1, NAB-22..33 |
| **Accounts** | Email/password sign-up and login for parents and educators; profile row created by a trigger; nobody can sign up as admin. Protected routes via middleware. | Authentication (NAB-2) |
| **Profiles** | Parent profile form; educator profile form with photo upload, services, education levels and locations. | Profiles (NAB-3) |
| **Educator directory** | `/educators` lists verified educators with filters; contact details are never exposed publicly (`educator_directory` view). | Tutor Directory (NAB-6) |
| **Requests** | Public feed of open requests with filters (`/requests`). Parents post, edit, close, cancel and reopen their own requests; a dashboard summarises them. | Parent Requests (NAB-5, NAB-61..64) |
| **Admin dashboard** | Educator verification (pending / verified / rejected / suspended), parent accounts (suspend / reactivate), request moderation (close / reopen / hide), and an activity log of every admin action. Suspension and hiding are enforced in the database. | Admin Dashboard (NAB-35) |
| **Quality** | Vitest unit and component tests, a repeatable database permission test suite (`supabase/tests/permissions.sql`), GitHub Actions CI (typecheck, tests, build), CodeRabbit review after each task. | Testing & Quality (NAB-44) |

## 2. Partly done

| Item | Gap |
| :--- | :--- |
| **Home page** | Layout is complete, but the featured educators, ratings and the stats counters show placeholder data. |
| **Educator dashboard** (`/teacher`) | Still a placeholder; becomes useful with offers. |
| **Contact / newsletter** | Forms don't store anything yet. |

## 3. Next up

| Feature | Description | Priority |
| :--- | :--- | :--- |
| **Offers** | Verified educators send an offer (price, schedule, message) on an open request; educators can't see each other's offers; the parent accepts one, which closes the request and declines the rest. | 🔴 Critical |
| **Public educator profiles** | `/educators/[id]` page per verified educator instead of the card only. | 🟠 High |
| **Real home page data** | Featured educators and counters from the database. | 🟠 High |
| **Notifications** | Tell parents about new offers and educators about accepted ones (in-app first, then email/WhatsApp). | 🟠 High |

## 4. Later

- **Ratings and reviews** after a completed engagement, with admin moderation of reported reviews.
- **Admin reports**: daily sign-ups, requests and accepted offers; most requested services and governorates.
- **Admin roles**: super admin, operations, support, read-only.
- **In-platform messaging** between a parent and the educator they accepted.
- **Online payment** for sessions.
