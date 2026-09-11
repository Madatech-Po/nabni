# UI Framework
The project must use:
- Material UI (MUI v7)
- MUI X (when needed)
- Material Icons
- React
- TypeScript

# Design Reference
The primary UI reference for this project is the official Material UI Skills repository.
Reference: https://github.com/mui/material-ui/tree/master/skills

All generated screens should follow the design language, layout philosophy, spacing system, and component patterns demonstrated in the repository. Do not copy code directly. Use it as the visual and architectural reference.

# Component Library
Whenever possible use existing Material UI components. Avoid creating custom components unless required by business needs. Favor composition over customization.

# Styling Rules
Use the MUI Theme system only. Do not use inline styles. Do not hardcode colors. Do not hardcode spacing. Do not hardcode typography. Everything should come from the theme.

# Theme
Create a single global theme. All pages must consume the same theme. Support Light Mode. Dark Mode should be easy to add later.

# Component Reusability
Every generated component must be reusable. Avoid duplicated UI. Prefer shared components.

# Dashboard Style
The Admin Dashboard, Teacher Dashboard, and Parent Dashboard should follow the same design language and layout patterns. Cards, tables, filters, dialogs, forms, charts, and navigation should look like a single cohesive application.

# AI Rule
Before generating any UI, always check the Design System first. If a requested UI pattern does not exist, propose an addition to the Design System before implementing it.

# UI Generation Workflow
When generating UI:
1. Read the Design System first.
2. Read the related specification.
3. Reuse existing components whenever possible.
4. Never create duplicate components.
5. Prefer extending existing components instead of creating new ones.
6. Keep the UI consistent across the entire platform.

# Next.js App Router + MUI Integration Pattern
- Server Components: Layouts and Pages must remain Server Components whenever possible for SEO and performance.
- MUI Providers: `AppRouterCacheProvider` (from `@mui/material-nextjs`) should wrap the application in `layout.tsx`.
- Theme Provider: `ThemeProvider` and `CssBaseline` MUST be wrapped in a dedicated Client Component (e.g., `src/theme/ThemeProvider.tsx` with `'use client';`) and imported into the Server Component layout to prevent hydration and runtime errors.
- Do NOT import `createTheme` or `ThemeProvider` directly into Server Components.
