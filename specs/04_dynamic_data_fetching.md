# Specification: Dynamic Data Fetching

## 1. What
Replace the hardcoded arrays (e.g., Governorates, Subjects, Educational Stages) currently living in the frontend JavaScript with dynamic data fetched from the Supabase database.

## 2. Why
Hardcoding operational data in frontend files makes the application difficult to update. By moving this data to the database, administrators can easily add new subjects, remove outdated specializations, or update regions without requiring a new code deployment.

## 3. Requirements
- Create utility functions to fetch data from Supabase tables (`governorates`, `subjects`, `stages`).
- Update the custom searchable dropdown React components to accept and display this asynchronous data.
- Ensure loading states are handled (e.g., showing a spinner or skeleton loader in the dropdown while fetching).
- Implement basic caching or React Server Components to avoid re-fetching static lookup tables on every single render.

## 4. Technical Details
- Use Supabase client `supabase.from('table').select('*')`.
- In Next.js App Router, fetch this data in Server Components where possible, passing the results down to the Client Components (the interactive dropdowns) as props.

## 5. Acceptance Criteria
- [ ] Registration forms fetch the list of Governorates directly from Supabase.
- [ ] Tutor registration fetches the list of Subjects and Stages from Supabase.
- [ ] Adding a new Governorate directly in the Supabase database immediately makes it available in the frontend dropdown without code changes.
- [ ] The search filtering within the dropdowns continues to function correctly with the dynamic data.
