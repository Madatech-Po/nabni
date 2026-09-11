# Specification: Public Tutor Profiles

## 1. What
Implement dynamic, public-facing profile pages for individual tutors (e.g., `/tutors/[id]`), transitioning the current UI modal design into a dedicated page.

## 2. Why
Parents need a detailed view of a tutor's qualifications, methodology, and pricing before committing to a booking. Dedicated URLs for profiles allow tutors to share their pages externally and improve SEO.

## 3. Requirements
- Create a dynamic route `/tutors/[id]`.
- Fetch the specific tutor's data from Supabase using the provided ID.
- Display comprehensive tutor details based on the existing modal design:
  - Cover Image / Header
  - Profile Picture
  - Full Name
  - Subjects and Stages
  - Pricing, Experience, Location
  - "About Me" Bio
  - Specific Specializations (Chips)
- Include a "Book Trial Session" Call-to-Action (CTA) button (which may just require login or show a "coming soon" toast for the MVP).
- Handle edge cases, such as an invalid ID (show a 404 page).

## 4. Technical Details
- Use Next.js dynamic routing.
- Utilize Next.js `generateMetadata` to dynamically create page titles and meta descriptions based on the tutor's name and subject for SEO purposes (e.g., "Mr. Ahmed - Arabic Tutor in Cairo | Nabni").
- Ensure the page is responsive and matches the premium UI aesthetic established in the prototype.

## 5. Acceptance Criteria
- [ ] Navigating to `/tutors/123-uuid` displays the correct details for that specific tutor from the database.
- [ ] The page title dynamically updates to reflect the tutor's name.
- [ ] Attempting to access a non-existent tutor ID renders a user-friendly "Tutor not found" or 404 page.
- [ ] The page looks visually consistent on both mobile and desktop devices.
