# Teacher Profile Specification

## Business Goal
Allow educators to professionally present their qualifications, experience, and availability to attract parents, while ensuring the platform maintains high quality through mandatory completion rules.

## User Stories
- As a Teacher, I want to complete my profile by adding my experience, subjects, and locations so parents know what I offer.
- As a Teacher, I want to upload a professional profile picture.
- As a Teacher, I want to define my teaching methods (Online, Offline, Both).

## Functional Requirements
- **Profile Fields:** Phone number (mandatory), Governorate (mandatory), City/Area (mandatory), Teaching areas (mandatory), Years of experience (mandatory), Bio (mandatory), Grades taught (mandatory), Subjects taught (mandatory), Teaching methods (mandatory).
- **Avatar Upload:** Capability to upload an image to Supabase Storage.
- **Activation Status:** A new teacher's `is_active` flag defaults to `false`. It only becomes eligible for activation once all mandatory fields are saved.

## Validations
- Phone number must follow the 11-digit Egyptian format (e.g., starts with 01).
- Bio must meet a minimum character count.
- Avatar must be an image file (JPG/PNG) under a specific size limit (e.g., 2MB).

## Acceptance Criteria
- [ ] A teacher cannot browse requests or submit offers if their profile is incomplete.
- [ ] Saving the profile updates the `profiles` and `teacher_details` tables in Supabase.
- [ ] A profile picture uploads successfully and renders on the frontend.
