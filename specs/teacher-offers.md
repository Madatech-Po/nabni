# Teacher Offers Specification

## Business Goal
Provide a frictionless way for teachers to apply for jobs (requests) while enforcing fair competition and data consistency.

## User Stories
- As a Teacher, I want to submit an offer including my price, schedule, and notes so a parent can evaluate my fit for their child.
- As a Teacher, I want to withdraw my offer if I am no longer available.

## Functional Requirements
- **Offer Submission:** Teachers fill out a form indicating Price, Notes, Available Schedule, and Expected Starting Date.
- **Blind Bidding:** Teachers cannot see the offers, prices, or identities of other teachers who have applied to the same request.
- **Offer Withdrawal:** Teachers can retract their pending offer.

## Validations & Business Rules
- A teacher **cannot** submit multiple active offers for the same request.
- A teacher **cannot** submit an offer if their profile is incomplete or unapproved by the admin.
- Price must be a positive integer.

## Acceptance Criteria
- [ ] Submitting an offer inserts a record into the `offers` table linked to the specific request and teacher.
- [ ] Once a teacher submits an offer, the "Submit Offer" button is disabled for that specific request to prevent duplicates.
- [ ] A withdrawn offer is marked as `withdrawn` or deleted, and the teacher can submit a new one if the request is still open.
