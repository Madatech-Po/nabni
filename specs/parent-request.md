# Parent Request Specification

## Business Goal
Empower parents to broadcast their specific educational needs to the marketplace, creating the primary driver of demand on the platform.

## User Stories
- As a Parent, I want to publish a detailed teaching request so that qualified teachers can find me and apply.
- As a Parent, I want to edit or cancel my request if my needs change.
- As a Teacher, I want to browse a feed of active requests to find potential students.

## Functional Requirements
- **Request Creation:** Parents input Student Grade, Subject, Student Age, Description of requirements, Preferred Teacher Gender (optional), Preferred Teaching Method, Governorate, Area, and Budget (optional).
- **Request Management:** Parents can view their own requests, edit the details (if no offers are accepted yet), or cancel/deactivate the request entirely.
- **Request Feed (Teacher View):** Teachers see a feed of active requests.

## Validations & RLS
- Student age must be within a logical range (e.g., 3-15).
- Description must meet a minimum length (e.g., 50 characters).
- **RLS:** Only the parent who created the request can edit or delete it.

## Acceptance Criteria
- [ ] A submitted request is immediately written to the `requests` table and appears in the teacher feed.
- [ ] A parent can successfully cancel a request, which removes it from the public feed.
- [ ] Contact info (Parent name, phone) is NOT visible on the public request feed.
