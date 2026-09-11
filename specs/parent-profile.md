# Parent Profile Specification

## Business Goal
Collect essential contact and location information from parents to facilitate accurate matching with local teachers and ensure valid communication channels.

## User Stories
- As a Parent, I want to add my contact details and location to my profile so that I can quickly post requests without re-entering my area every time.

## Functional Requirements
- **Profile Fields:** Name (from signup), Phone Number (mandatory), Governorate (mandatory), City/Area (mandatory).
- **Edit Capability:** Parents can update their phone number and location at any time.

## Validations
- Phone number must follow the 11-digit Egyptian format (e.g., starts with 01).

## Acceptance Criteria
- [ ] A parent must complete their basic profile before they are allowed to publish a teaching request.
- [ ] Updating the profile successfully saves the data to the `profiles` table in Supabase.
- [ ] The parent's phone number remains strictly private and is not displayed publicly on the platform.
