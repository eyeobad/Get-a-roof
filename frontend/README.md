# Get a Roof

`Get a Roof` is a mobile-first Next.js experience that orchestrates the tenant/landlord journey with a centralized data model, swipe-like property matching, and role-aware verification flows.

## Developer notes

- Run the dev server with `npm run dev` (or `pnpm dev`/`yarn dev`) and visit [http://localhost:3000](http://localhost:3000).
- All UI iterations live under `src/app` and consume the shared `font-display` stack defined in `globals.css`.
- Tailwind is configured in `tailwind.config.js` with `primary`, `background-light`, and `background-dark` for consistent styling plus `@tailwindcss/forms` to keep inputs disciplined.
- The root page currently renders the branded splash (4s) and redirects to `/login`, so every fresh session lands on the login experience.

## Architecture references

- `src/app/login/page.tsx` – tenant-friendly login layout with inline SVG icons, working visibility toggle, and links into `create-account`.
- `src/app/create-account` & `tenant-signup` – role selection, tenant onboarding, and signup screens sharing the same typography/sizing tokens.
- `tailwind.config.js` + `globals.css` – drive the color palette, font imports, and shared utility classes for forms and backgrounds.

For the detailed functional logic and data flow that drives the backend workflows, see `GET-A-ROOF-FLOW.md`.
