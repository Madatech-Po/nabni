# Search and Discovery Specification

## Business Goal
Maximize marketplace liquidity by making it effortless for parents to find the right teachers, and for teachers to find relevant teaching requests. An intuitive search and discovery experience reduces friction and accelerates the matching process.

## User Stories
- As a Parent, I want to search a directory of approved teachers and filter them by subject, location, and teaching method, so I can proactively find the best fit for my child.
- As a Teacher, I want to browse an active feed of teaching requests and filter them by subject and location, so I can easily find and apply to jobs that match my expertise.
- As a User (Parent/Teacher), I want the URL to update when I apply filters, so I can bookmark or share a specific search result.

## Functional Requirements

### 1. Tutor Directory (Parent View)
- **Public Access:** The directory (`/tutors`) is publicly accessible to maximize SEO and user acquisition.
- **Search Bar:** Free-text search by teacher name or keyword (bio contents).
- **Filters:**
  - Subject (e.g., Math, Arabic).
  - Educational Stage (e.g., Primary, Preparatory).
  - Governorate & City.
  - Teaching Method (Online, Offline, Both).
- **Sorting:** Default by "Highest Rated", options for "Newest Joined".
- **Presentation:** A grid of "Tutor Cards" summarizing their avatar, name, rating, subjects, and price.

### 2. Request Feed (Teacher View)
- **Private Access:** The request feed (`/requests`) is only accessible to authenticated, approved teachers.
- **Default View:** Automatically filters open requests based on the teacher's registered subjects and governorate.
- **Search Bar:** Free-text search within request descriptions.
- **Filters:**
  - Subject.
  - Grade.
  - Governorate & City.
- **Sorting:** Default by "Newest", option for "Highest Budget" (if applicable).
- **Presentation:** A list view of request cards highlighting the grade, location, parent's required method, and time posted.

## Non-Functional Requirements
- **Performance:** Search queries must execute efficiently (< 300ms latency) by utilizing proper PostgreSQL indexes in Supabase.
- **SEO Optimization:** The public tutor directory and individual tutor profile pages must utilize Server-Side Rendering (SSR) so search engines can index them.

## Validations & Business Rules (RLS)
- **Teacher Visibility:** Only teachers with `is_active = true` AND `is_approved = true` are returned in the Tutor Directory search queries.
- **Request Visibility:** Only requests with `status = 'open'` are returned in the Teacher Request Feed. Once an offer is accepted, the request immediately disappears from search results.

## Acceptance Criteria
- [ ] A user can select "Cairo" and "Arabic" in the directory filters and immediately see a filtered grid of matching approved teachers.
- [ ] Changing a filter updates the URL query parameters (e.g., `?subject=Arabic&gov=Cairo`).
- [ ] A teacher viewing the request feed only sees requests that are currently "open" and not already assigned.
- [ ] Pagination or infinite scrolling loads additional results seamlessly without freezing the page.
