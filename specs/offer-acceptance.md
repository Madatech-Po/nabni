# Offer Acceptance Specification

## Business Goal
Enable parents to securely evaluate and hire teachers, automatically managing the lifecycle of requests and unlocking communication channels only when trust is established.

## User Stories
- As a Parent, I want to view, compare, accept, or reject offers received from teachers.
- As a User (Parent/Teacher), I want to view the contact details (phone number) of the other party *only after* an offer is accepted to coordinate the first session securely.

## Functional Requirements
- **Offer Dashboard (Parent):** Parents can view a list of all pending offers on their specific request.
- **Acceptance Action:** Clicking "Accept" on an offer.
- **Rejection Action:** Clicking "Reject" on an offer.
- **Contact Reveal:** UI updates to show the Teacher's phone number to the Parent, and the Parent's phone number to the Teacher in their respective "Active Engagements" views.

## Validations & Business Rules
- **Exclusive Acceptance:** Accepting one offer automatically changes the request status to `closed` and implicitly/explicitly rejects all other pending offers for that request.
- **RLS:** Parents can only see offers made on their own `request_id`.

## Acceptance Criteria
- [ ] Accepting an offer successfully updates the offer status to `accepted` and the request status to `closed`.
- [ ] Other pending offers on the same request are marked as `rejected` or archived.
- [ ] Phone numbers are successfully revealed to both parties immediately following acceptance.
