# Get a Roof

`Get a Roof` is a two-sided rental platform that connects tenants with landlord listings through matching, real-time messaging, and verification flows. It is built as a mobile-first Next.js frontend with a NestJS + MongoDB backend.

## The Problem We Solve

Finding a rental home is fragmented: listings are scattered, response times are slow, and landlords lack efficient tools to review candidates. We solve this by:
- Making discovery and matching fast and structured.
- Giving landlords a clear, ranked candidate queue.
- Keeping both sides in one real-time chat channel.
- Enforcing role-based access (tenant vs landlord) with verification.

## Solution Overview

- Tenant journey: browse, filter, swipe-like matching, save listings, start chat, and complete onboarding.
- Landlord journey: manage listings, review ranked matches, chat with tenants, and verify identity.
- Real-time messaging: socket-based chat with typing indicators, unread counts, and conversation ordering.
- Security and data hygiene: strict DTO validation, access control, rate limiting, sanitized inputs.

## Core Features

- Explore and Match: filterable discovery with map view and match scoring.
- Real-time Chat: per-match messaging, unread badges, typing indicators, and live updates.
- Role-aware Dashboards: dedicated landlord dashboard and tenant experience.
- Verification: email OTP, identity verification paths (extensible for KYC providers).
- Property Management: listing creation, image/proof uploads, and editable drafts.

## Tech Stack

- Frontend: Next.js (App Router), Zustand, TailwindCSS, Socket.io client.
- Backend: NestJS, Mongoose (MongoDB), Socket.io, JWT.
- Storage: Appwrite (for images and uploads).
- Email: Resend (OTP delivery).

## Architecture Highlights

- Auth session cookie: `pages/api/auth/session` stores JWT in httpOnly cookie.
- Role guard: `src/middleware.ts` blocks tenant/landlord cross-routes.
- Chat pipeline: type-safe aggregation, participant checks, and room-based socket updates.
- Match scoring: computed in backend and surfaced in landlord dashboard.

## Security Hardening (Backend)

- ValidationPipe with `whitelist` and `forbidNonWhitelisted`.
- Rate limiting (`@nestjs/throttler`) with env-configurable TTL/limit.
- Helmet for HTTP hardening.
- Input sanitization against NoSQL injection.
- MIME type enforcement for uploads (images and PDFs).
- Strict role checks on protected endpoints.

## Environment Variables

Backend (`backend/.env`):
- `MONGODB_URI`
- `JWT_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `THROTTLE_TTL`, `THROTTLE_LIMIT`
- `CORS_ORIGINS`
- `APPWRITE_*` (if using Appwrite storage)

Frontend (`frontend/.env.local`):
- `JWT_SECRET` (for middleware role checks)
- `NEXT_PUBLIC_API_URL` (optional override; defaults to `http://localhost:3001`)

## Running Locally

Backend:
```
cd backend
npm install
npm run start:dev
```

Frontend:
```
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Known Production Requirements

- Resend domain must be verified for OTP emails (otherwise 403).
- `CORS_ORIGINS` should include your deployed frontend domain.
- Add a proper KYC provider (Onfido/Persona/Veriff) for production ID and face verification.

## References

- Login: `src/app/login/page.tsx`
- Tenant onboarding: `src/app/tenant-onboarding/*`
- Landlord dashboard: `src/app/dashboard/*`
- Chat: `src/app/messages`, `src/store/useAppStore.ts`, `backend/src/chat/*`
- Verification flow: `src/app/auth/*`, `backend/src/auth/*`

For full system flow, see `GET-A-ROOF-FLOW.md`.
