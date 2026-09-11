# Specification: Tutor Directory (Listing Page)

## 1. What
Create a dedicated page (e.g., `/tutors`) that displays a searchable, filterable grid of all active and approved tutors on the platform.

## 2. Why
The core value of the marketplace is allowing parents to find tutors. The directory is the primary discovery mechanism for the platform.

## 3. Requirements
- Create a new route `/tutors`.
- Display a list of tutor cards. Each card should show:
  - Tutor Avatar
  - Tutor Name
  - Primary Subject
  - Governorate / Region
  - Hourly Rate
  - Experience Years
  - Rating (Placeholder for now)
- Implement a filtering sidebar or top bar allowing parents to filter the list by:
  - Subject
  - Governorate
  - Educational Stage
- Implement pagination or infinite scrolling if the list of tutors grows large.

## 4. Technical Details
- Query the `profiles` table joined with the `tutor_details` table where `role = 'tutor'` and `is_approved = true`.
- Use Next.js Server Components for the initial data fetch to ensure SEO friendliness.
- Use Client Components for the interactive filtering mechanism, updating URL search parameters (e.g., `?subject=math&gov=cairo`) so search states are shareable.

## 5. Acceptance Criteria
- [ ] Navigating to `/tutors` displays a grid of approved tutors fetched from the database.
- [ ] Changing a filter (e.g., selecting "Cairo") instantly updates the list to show only tutors in Cairo.
- [ ] Selecting a subject filter shows only tutors teaching that subject.
- [ ] The "Search for Tutor" buttons on the landing page correctly route the user to this directory page.
