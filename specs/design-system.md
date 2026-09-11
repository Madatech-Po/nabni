# Nabni Design System

**Single Source of Truth** for all UI development within the Nabni platform.

## Architecture & Tech Stack
- **Framework:** React + TypeScript
- **UI Library:** Material UI (MUI v7) + MUI X
- **Backend:** Supabase
- **Direction:** Arabic-first (RTL)
- **Primary Reference:** [MUI Skills Repository](https://github.com/mui/material-ui/tree/master/skills) (Used for design language, layout philosophy, spacing system, and architectural patterns. Code is not copied directly, but the visual standard is strictly maintained).

---

## 1. Design Principles
- **Modern & Minimal:** Clean interfaces with ample whitespace, avoiding clutter.
- **Professional & Trustworthy:** Instilling confidence in parents and educators.
- **Arabic-first (RTL):** Native right-to-left layout support across all components.
- **Mobile-first:** Fully responsive design prioritizing smaller screens.
- **Accessible:** Complying with WCAG guidelines for color contrast and screen readers.
- **Highly Reusable:** Eliminating duplicate code through shared components.
- **Consistent:** Uniform behaviors and aesthetics across all dashboards.

---

## 2. UI Foundation
*All values must be accessed via the MUI Theme, never hardcoded.*

- **Color Palette:**
  - `Primary`: Trustworthy Blue/Teal (exact hex defined in theme).
  - `Secondary`: Warm complementary color for accents.
  - `Background`: Light gray/off-white (`#F9FAFB` or similar) for contrast against white cards.
  - `Text`: High contrast dark grays (`text.primary`, `text.secondary`).
  - `Semantic`: Standardized Error (Red), Success (Green), Warning (Orange), Info (Blue).
- **Typography:**
  - **Font Family:** `Cairo` or `Tajawal` (Google Fonts) tailored for Arabic legibility.
  - **Font Scale:** Modular scale defined in the theme (e.g., h1 to h6, body1, body2, caption).
- **Shape & Border Radius:** Modern, soft corners. Default `borderRadius` set to `8px` or `12px` globally.
- **Elevation & Shadows:** Soft, diffuse shadows (inspired by modern SaaS). Avoid harsh, dark drop-shadows.
- **Spacing System:** 8px base grid (`theme.spacing(1) = 8px`).
- **Icon System:** Standard `Material Icons` (Rounded or Outlined variants for a modern look).
- **Responsive Breakpoints:** Standard MUI breakpoints (`xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536`).

---

## 3. Theme
- **Single Global Theme:** A central `createTheme` configuration consumed by the `<ThemeProvider>`.
- **Strict Adherence:** All colors, spacing, typography, borders, and elevations **must** come from the theme (e.g., `sx={{ mt: 2, color: 'primary.main' }}`).
- **Mode:** Currently supports Light Mode. The theme architecture must allow toggling to Dark Mode in the future without refactoring components.

---

## 4. Component Standards
*Favor composition over customization. Use existing MUI components.*

- **Buttons:** Use `variant="contained"` for primary actions, `outlined` for secondary, `text` for tertiary. Maintain consistent padding.
- **Inputs & Selects:** Use `variant="outlined"` consistently. Include clear labels and placeholder text.
- **Autocomplete:** Used for searchable dropdowns (e.g., Governorates, Subjects).
- **Checkboxes, Radios, Switches:** Standard MUI components using the primary theme color.
- **Dialogs:** Must have a clear title, content area, and action buttons right-aligned (in LTR, left-aligned in RTL). Avoid deeply nested dialogs.
- **Drawers:** Used for mobile navigation or complex filters.
- **Cards:** White background, subtle border or soft shadow. Used to group related content.
- **Tables & Data Grid:** Use MUI Table for simple data, MUI X DataGrid for complex, sortable, or paginated admin data.
- **Pagination:** Standard MUI Pagination component, placed at the bottom center or right of lists.
- **Tabs:** Used for sub-navigation within pages.
- **Breadcrumbs:** Essential for nested admin/dashboard views.
- **Badges & Chips:** Use Chips for statuses (e.g., "Pending", "Accepted") and selected filters. Badges for notification counts.
- **Alerts & Snackbars:** Use Snackbars for ephemeral success/error feedback. Use Alerts for persistent inline warnings.
- **Loading & Skeletons:** Prefer Skeletons over spinners for initial page loads to reduce perceived latency. Use circular progress for button loading states.
- **Empty States:** Must include a friendly illustration/icon, a clear message, and a Call-to-Action (CTA) if applicable.
- **Search & Filters:** Real-time search where possible, debounced. Filters should be easily clearable.
- **Forms:** Vertical layouts by default, clear validation messages below inputs.
- **Charts:** (Future) Consistent color palettes matching the theme.
- **Dashboard Layout:**
  - **Sidebar:** Collapsible on desktop, drawer on mobile.
  - **Top Bar:** Contains breadcrumbs, user menu, and notifications.
  - **Footer:** Minimal, containing essential links.

---

## 5. Dashboard Standards
The **Admin Dashboard**, **Teacher Dashboard**, and **Parent Dashboard** must follow the exact same design language and layout patterns. 
- A parent navigating to their dashboard should feel they are using the exact same app as a teacher. 
- Cards, tables, filters, dialogs, forms, charts, and navigation must look like a single cohesive application.

---

## 6. Shared Components
A reusable component catalog is mandatory. 
- Every future screen must reuse existing components whenever possible.
- Avoid duplicate components (e.g., do not build a `<TeacherCard>` and a `<ParentCard>` if a generic `<ProfileCard>` with role props suffices).

---

## 7. Component Organization
All UI components must be organized into a logical, scalable folder structure:

```text
components/
  common/       (Generic UI: Buttons, Spinners, Skeletons)
  layout/       (Navbar, Sidebar, Footer, Layout Wrappers)
  forms/        (Inputs, Selects, Form Wrappers)
  tables/       (DataGrid configurations, standard tables)
  cards/        (Profile cards, Stats cards)
  dialogs/      (Confirmation modals, Action dialogs)
  navigation/   (Breadcrumbs, Tabs, Menus)
  dashboard/    (Shared dashboard widgets)
  teacher/      (Teacher-specific views/components)
  parent/       (Parent-specific views/components)
  admin/        (Admin-specific views/components)
```

---

## 8. UX Guidelines
- **Page Spacing:** Consistent outer margins (e.g., `px: { xs: 2, md: 4 }`, `py: 3`).
- **Form Spacing:** Use `gap: 2` or `spacing={2}` between form fields.
- **Card Spacing:** Use a consistent grid gap (`gap: 3`) for lists of cards.
- **Button Placement:** Primary action on the leading side for RTL (which translates to the left visually, but follow standard MUI RTL behavior).
- **Dialog Behavior:** Close on backdrop click (unless data loss is at risk). No 'X' button strictly required if 'Cancel' exists.
- **Validation:** Instant feedback on blur; submit button disabled if form is visibly invalid.
- **Empty States:** Never leave a screen completely blank. Explain *why* it's empty.
- **Error States:** Clear, non-technical error messages explaining how to recover.
- **Success Feedback:** Snackbars for actions (e.g., "Offer submitted successfully").

---

## 9. Accessibility
- **Keyboard Navigation:** All interactive elements must be focusable and operable via the keyboard.
- **Focus Management:** Visible focus rings (MUI default). Focus trapped within open dialogs.
- **ARIA:** Proper `aria-labels` for icon-only buttons.
- **Color Contrast:** Text must pass WCAG AA contrast ratios against its background.
- **Touch Targets:** Minimum 44x44px for clickable areas on mobile.

---

## 10. Animation
- **Subtle animations only.**
- **Maximum duration:** 300ms (MUI default transitions).
- Avoid excessive motion, heavy parallax, or bouncy effects. Use simple fade or slide transitions.

---

## 11. Naming Convention
- **Components:** `PascalCase` (e.g., `ProfileCard.tsx`).
- **Pages/Routes:** `kebab-case` directories (e.g., `app/teacher-dashboard/page.tsx`).
- **Hooks:** `camelCase` starting with `use` (e.g., `useAuth.ts`).
- **Contexts & Providers:** `PascalCase` with suffix (e.g., `ThemeContext.tsx`, `AuthProvider.tsx`).
- **Layouts:** `PascalCase` with suffix (e.g., `DashboardLayout.tsx`).
- **Dialogs & Forms:** Suffix accordingly (e.g., `AcceptOfferDialog.tsx`, `SignupForm.tsx`).

---

## 12. AI Development Rules
Every future implementation MUST:
1. **Read this Design System first.**
2. **Follow the related Feature Specification.**
3. **Reuse existing components** whenever possible.
4. **Never duplicate UI components.**
5. **Never hardcode colors** (e.g., `color="red"` -> `color="error.main"`).
6. **Never hardcode typography** (e.g., `fontSize="16px"` -> use standard variants like `variant="body1"`).
7. **Never hardcode spacing** (e.g., `marginTop="20px"` -> `mt={2.5}`).
8. **Never create inconsistent layouts.**
9. **Always use the Material UI Theme.**
10. **Keep UI consistent** across the entire application.

*If a required component does not exist, propose an update to the Design System before implementing it.*

---

## 13. Future Scalability
The Design System is architected to support adding new modules (e.g., Messaging, Payments) without requiring a platform redesign. New features will simply compose existing foundational components defined here.
