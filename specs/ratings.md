# Ratings Specification

## Business Goal
Build platform trust and maintain quality control by allowing users to share authentic feedback on their educational engagements.

## User Stories
- As a Parent, I want to rate the teacher and leave a comment after our engagement to help other parents.
- As a Teacher, I want to rate the parent to indicate their reliability and communication.

## Functional Requirements
- **Rating Form:** Simple UI allowing a 1-5 star selection and an optional text comment.
- **Rating Display:** Aggregate ratings (average stars) are displayed on the Teacher's public profile.

## Validations & Business Rules
- **Eligibility:** Ratings are *only* allowed between a specific Parent and Teacher who have a historically `accepted` request.
- **One per Engagement:** A user can only rate the other party once per accepted request (no duplicate ratings).
- **Delay (Future):** Ratings should ideally unlock only after the expected starting date has passed.

## Acceptance Criteria
- [ ] Attempting to rate a user without an accepted request connection is blocked by the backend (RLS/Functions).
- [ ] Submitting a rating saves it to the `ratings` table.
- [ ] The Teacher's average rating dynamically recalculates and displays correctly on their profile.
