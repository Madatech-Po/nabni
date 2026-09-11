# Specification: Tech Stack Migration

## 1. What
Migrate the existing static HTML, CSS, and Vanilla JavaScript codebase of Nabni into a modern React-based framework using Next.js (App Router).

## 2. Why
The current architecture relies on a single massive `app.js` file for state management, modal logic, and DOM manipulation. As the platform scales to include complex forms, authentication, dynamic directories, and booking systems, maintaining Vanilla JS will result in high technical debt. Next.js provides robust routing, component reusability, state management, and Server-Side Rendering (SSR) for SEO.

## 3. Requirements
- Initialize a new Next.js project using the App Router (`app/` directory).
- Configure Tailwind CSS natively using `postcss` and `tailwind.config.js` (removing the CDN link).
- Break down `index.html` into reusable React components (e.g., `Navbar`, `Hero`, `Features`, `Footer`).
- Convert Vanilla JS modal logic into React state (`useState`) and context/portals.
- Convert custom searchable dropdowns into reusable controlled React components.
- Retain the exact visual design, dark mode functionality, and animations of the original prototype.

## 4. Technical Details
- Framework: Next.js (React 18+)
- Styling: Tailwind CSS
- Icons: Install `@fortawesome/fontawesome-svg-core` and related React packages instead of CDN.
- Fonts: Use `next/font/google` for the Cairo font to optimize loading.

## 5. Acceptance Criteria
- [ ] Running `npm run dev` successfully launches the Next.js application.
- [ ] The landing page looks pixel-perfect identical to the original static `index.html`.
- [ ] Dark mode toggle works and persists state correctly.
- [ ] The mobile navigation menu opens and closes smoothly.
- [ ] Multi-step modals open, transition between steps, and close properly using React state.
