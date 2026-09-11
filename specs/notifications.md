# Notifications Specification

## Business Goal
Keep users engaged and informed about critical events in their lifecycle (such as receiving offers, getting profile approval, or having an offer accepted) to reduce response latency and build a highly responsive marketplace. A multi-channel notification approach ensures users are reached even when they are not actively browsing the platform.

## User Stories
- As a Teacher, I want to receive an email and an in-app notification when my profile is approved by an admin, so I know I can start browsing and bidding on requests.
- As a Teacher, I want to be notified (in-app and via email) when a Parent accepts my offer, so I can view their contact details and coordinate the first session immediately.
- As a Parent, I want to receive an email alert when a Teacher submits a new offer on my request, so I don't keep the teacher waiting.
- As a User, I want to see an unread badge on my notification bell so I don't miss important updates while browsing the site.

## Functional Requirements

### 1. In-App Notifications (MVP)
- **UI Element:** A notification bell icon in the navigation bar with a dynamic unread count badge. Clicking it reveals a dropdown menu of recent notifications.
- **Interactivity:** Clicking a notification marks it as `is_read = true` and routes the user to the relevant page (e.g., clicking "New Offer" redirects to the specific request dashboard).
- **Real-time Delivery:** Utilize Supabase Realtime (WebSockets) to push new notifications to the active session instantly without requiring a page refresh.

### 2. Email Notifications (MVP)
- **System Integration:** Integrate an email provider (e.g., Resend, SendGrid, or AWS SES) triggered via Supabase Database Webhooks or Edge Functions.
- **Critical Alerts:** Emails are reserved for high-priority actions to avoid spamming:
  - Welcome Email (On signup).
  - Profile Approved (To Teacher).
  - New Offer Received (To Parent).
  - Offer Accepted (To Teacher).
- **Format:** HTML emails with clear Calls-to-Action (e.g., a "View Offer" button linking directly to the platform).

### 3. Push Notifications (Future)
- **Mobile Integration:** In post-MVP phases (Version 2), implement mobile Push Notifications (via Firebase Cloud Messaging - FCM or Apple Push Notification Service - APNs).
- **Web Push:** Utilize the Web Push API for desktop and Android browsers to alert users when the app is closed.
- **Preference Center:** Allow users to opt-in or opt-out of push notifications vs email notifications.

## Triggering Events & Payloads
- `PROFILE_APPROVED`
- `NEW_OFFER_RECEIVED`
- `OFFER_ACCEPTED`
- `REQUEST_CLOSED` (Sent in-app only, to Teachers whose pending offers were implicitly rejected).

## Non-Functional Requirements
- **Data Retention:** In-app notifications older than 30 days should be automatically archived or deleted to optimize database performance.
- **Delivery Reliability:** Ensure email sending functions have retry logic in case of third-party API failures.

## Validations & Business Rules
- A user can only fetch and view in-app notifications where `user_id` matches their own authenticated ID (Strict RLS).

## Acceptance Criteria
- [ ] A `notifications` table exists in Supabase tracking `user_id`, `type`, `message`, and `is_read`.
- [ ] When a parent receives an offer, an email is successfully delivered to their registered email address within 1 minute.
- [ ] The frontend notification bell displays the correct count of unread notifications in real-time.
- [ ] Clicking an in-app notification marks it as read and successfully navigates to the correct context.
