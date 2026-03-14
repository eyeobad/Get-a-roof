# GET A ROOF

GET A ROOF is a real-estate matching platform with two applications in one repository:

- `frontend/`: Next.js 16, React 19, Zustand, Tailwind CSS 4
- `backend/`: NestJS 11, MongoDB, JWT auth, Firebase Admin SDK, Resend, reCAPTCHA

This `README.md` is now the single project document. It starts with setup and local running, then moves into the full security, architecture, matching, and implementation guide that used to live in `SECURITY.md`.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Layout](#repository-layout)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Environment Variables](#environment-variables)
6. [Running Locally](#running-locally)
7. [Database Seed & Maintenance](#database-seed--maintenance)
8. [Build, Lint, and Test Commands](#build-lint-and-test-commands)
9. [Deployment Notes](#deployment-notes)
10. [Detailed Architecture, Security, Matching, and Implementation Guide](#detailed-architecture-security-matching-and-implementation-guide)

---

## Project Overview

GET A ROOF supports:

- tenant onboarding, matching, map search, route-request messaging, and swipe-style exploration
- landlord listing creation, property management, match review, messaging, and profile management
- admin moderation, listing review, user actions, and operational oversight
- Google sign-in via Firebase, email/password auth, OTP verification, JWT session cookies, and role-based access control

The frontend talks to the backend over REST APIs. MongoDB stores users, properties, matches, messages, and moderation state. Firebase is used for Google identity verification. Resend is used for email delivery. reCAPTCHA is used for signup bot protection.

## Repository Layout

```text
GET A ROOF/
  backend/    NestJS API, Mongo models, auth, matching, admin logic, seed scripts
  frontend/   Next.js app, Zustand store, route UI, dashboard UI, map/explore flows
```

Key application entry points:

- `backend/src/main.ts`: NestJS bootstrap, validation, security middleware, CORS
- `backend/src/app.module.ts`: backend module composition
- `frontend/src/app/layout.tsx`: global app shell
- `frontend/src/store/useAppStore.ts`: main client state, auth state, listing/match actions

## Prerequisites

You need:

- `Node.js` 20 or newer
- `npm`
- MongoDB Atlas or a reachable MongoDB instance
- Firebase project for Google auth
- Google reCAPTCHA v3 keys
- Resend API key for production email sending
- Mapbox public token for map view

## Installation

### Backend

```powershell
cd backend
npm install
```

### Frontend

```powershell
cd frontend
npm install
```

## Environment Variables

### Backend: `backend/.env`

Required core variables:

```env
MONGODB_URI=
JWT_SECRET=
PORT=3001
OTP_SECRET=
RECAPTCHA_SECRET_KEY=
RESEND_API_KEY=
RESEND_FROM=
```

Firebase Admin variables:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Recommended operational variables:

```env
THROTTLE_TTL=60
THROTTLE_LIMIT=100
CORS_ORIGINS=http://localhost:3000,https://your-frontend-domain.example
MAIL_FROM=no-reply@get-a-roof.com
```

Optional platform/service variables already used in this codebase include Appwrite storage, Termii, and mail fallbacks depending on environment.

### Frontend: `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
```

Notes:

- `NEXT_PUBLIC_API_URL` should point to the backend base URL.
- `NEXT_PUBLIC_MAPBOX_TOKEN` is required for map rendering and route requests.
- Firebase web config must match the Firebase project used by the backend.
- reCAPTCHA frontend and backend keys must be the same project/key pair and the correct version.

## Running Locally

### Start backend

```powershell
cd backend
npm run start:dev
```

Backend default URL:

```text
http://localhost:3001
```

### Start frontend

```powershell
cd frontend
npm run dev
```

Frontend default URL:

```text
http://localhost:3000
```

Recommended local startup order:

1. Start the backend first and confirm MongoDB connection.
2. Start the frontend and confirm `NEXT_PUBLIC_API_URL` points at the backend.
3. Log in with a seeded or existing account.
4. Exercise core routes: `/explore`, `/matches`, `/messages`, `/dashboard/*`, `/admin/*`.

## Database Seed & Maintenance

Seed script:

```powershell
cd backend
npm run seed
```

Common maintenance scripts:

```powershell
npm run cleanup:orphans
npm run verify:listings
```

If seeding large datasets on Windows causes memory pressure, use a larger Node heap temporarily:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=6144"
npm run seed
```

Seeded credentials depend on the current seed file, but common development accounts used in this repository have included:

- Landlord: `seunv0619@gmail.com / Victor1@seun`
- Tenant: `tenant@getaroof.dev / Victor1@seun`
- Tenant 2: `tenant2@getaroof.dev / Victor1@seun`

Check `backend/src/seed.ts` if you need the exact current values.

## Build, Lint, and Test Commands

### Backend

```powershell
cd backend
npm run build
npm run test
```

### Frontend

```powershell
cd frontend
npm run lint
npm run build
```

Use these as the minimum validation set before pushing or deploying changes.

## Deployment Notes

Current deployment shape used in this project has included:

- frontend on Vercel
- backend on Render
- MongoDB Atlas for persistence

Production notes:

- Render free instances can cold-start; they are functional but not ideal for low-latency production workloads.
- In-memory caches help but reset on restart.
- For stable performance, use an always-on backend and external cache if traffic grows.
- Ensure frontend and backend origins are aligned in `CORS_ORIGINS` and frontend env values.

## Detailed Architecture, Security, Matching, and Implementation Guide
> **Audience**: Backend and frontend developers working on this codebase.  
> **Last Updated**: March 2026  
> **Stack**: NestJS (backend) · Next.js (frontend) · MongoDB · Firebase Admin SDK · JWT (Passport.js)

---

## Table of Contents

1. [Authentication Overview](#1-authentication-overview)
2. [Firebase Google Authentication](#2-firebase-google-authentication)
3. [Email / Password Authentication](#3-email--password-authentication)
4. [JWT Strategy & Token Lifecycle](#4-jwt-strategy--token-lifecycle)
5. [OTP Verification System](#5-otp-verification-system)
6. [Password Reset Flow](#6-password-reset-flow)
7. [Rate Limiting](#7-rate-limiting)
8. [reCAPTCHA v3 Bot Protection](#8-recaptcha-v3-bot-protection)
9. [Suspension & Instant Token Revocation](#9-suspension--instant-token-revocation)
10. [Role-Based Access Control (RBAC)](#10-role-based-access-control-rbac)
11. [Input Validation & Sanitisation](#11-input-validation--sanitisation)
12. [HTTP Security Headers](#12-http-security-headers)
13. [File Upload Security](#13-file-upload-security)
14. [Environment Variables & Secrets](#14-environment-variables--secrets)
15. [Frontend Session Management](#15-frontend-session-management)
16. [Security Checklist for New Endpoints](#16-security-checklist-for-new-endpoints)
17. [Match Algorithm & Scoring Engine](#17-match-algorithm--scoring-engine)
18. [Recent Implementation Log](#18-recent-implementation-log)

---

## 1. Authentication Overview

GET A ROOF supports two authentication methods:

| Method | Entry Point | Used By |
|--------|-------------|---------|
| **Google OAuth via Firebase** | `POST /api/auth/google` | Tenants & Landlords (social signup/login) |
| **Email + Password** | `POST /api/auth/login` | Tenants & Landlords (manual signup/login) |

Both methods issue a **signed JWT** upon success, which the frontend stores in an `HttpOnly`-equivalent cookie (`gar_session`) via a Next.js API route and also in memory (Zustand store) for API calls.

```
User ? Firebase (Google popup) ? Firebase ID Token ? POST /api/auth/google ? JWT
User ? Email + Password Form  ?                    ? POST /api/auth/login  ? JWT
```

---

## 2. Firebase Google Authentication

### How It Works

1. **Frontend** (`frontend/src/lib/firebase.ts`): calls `signInWithPopup()` with `GoogleAuthProvider`, which opens the Google sign-in popup. On success, it retrieves the **Firebase ID Token** via `getIdToken()`.

2. **Frontend** sends the ID token to the backend:
   ```typescript
   POST /api/auth/google
   Body: { firebaseIdToken: "<firebase-token>", role: "Tenant" | "Landlord" }
   ```

3. **Backend** (`backend/src/auth/firebase-admin.ts`) calls `getFirebaseAuth().verifyIdToken(token)`. This:
   - Validates the token's **cryptographic signature** against Firebase's public keys.
   - Verifies the token is not expired.
   - Checks the `email_verified` claim — **unverified Google emails are rejected** with a 401.
   - Extracts `email`, `name`, and `uid` from the decoded payload.

4. Backend then upserts the user in MongoDB and issues a JWT.

### Security Guarantees

| Guarantee | How It's Achieved |
|-----------|------------------|
| Token is authentic | Firebase Admin SDK verifies the RS256 signature |
| Email is verified | `decoded.email_verified` is checked and enforced |
| Token cannot be forged | Private key is never sent to the client |
| `firebaseIdToken` is mandatory | DTO uses `@IsString() @IsNotEmpty()` — requests without it are rejected with 400 |

### Key Files

- `backend/src/auth/firebase-admin.ts` — initialises Firebase Admin SDK; handles private key parsing from `.env`
- `backend/src/auth/auth.service.ts` ? `resolveFirebaseIdentity()` — verifies token and extracts identity
- `backend/src/auth/dto/google-login.dto.ts` — DTO requiring `firebaseIdToken`
- `frontend/src/lib/firebase.ts` — client-side Firebase SDK and token retrieval

### Common Pitfall: Private Key Format

The `FIREBASE_PRIVATE_KEY` in `.env` must be wrapped in double quotes with literal `\n` sequences:

```env
# ? Correct
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"

# ? Wrong — double-escaped, key will be corrupted at runtime
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\nMIIE...
```

`firebase-admin.ts` calls `.replace(/\\n/g, "\n")` to convert `\n` sequences into real newlines. If the key is double-escaped, this fails silently and Firebase Admin SDK throws `auth/invalid-credential` errors.

---

## 3. Email / Password Authentication

### Signup Flow

```
POST /api/users  (CreateUserDto)
  +- reCAPTCHA token verified (all roles)
  +- Email uniqueness checked
  +- Password bcrypt-hashed (cost factor 10)
  +- User saved with emailVerified: false
  +- Signup verification token (HMAC-SHA256) generated and emailed
  +- Returns PENDING_VERIFICATION response

? User submits OTP from email
POST /api/auth/verification/verify-email-otp
  +- Verifies OTP hash
  +- Sets emailVerified: true
  +- Issues JWT
```

### Login Flow

```
POST /api/auth/login  (LoginDto: { email, password })
  +- User fetched by email (case-insensitive)
  +- bcrypt.compare(password, user.loginCredentials.passwordHash)
  +- Suspension check
  +- JWT issued
```

### Password Storage

Passwords are **never stored in plaintext**. bcrypt with a cost factor of 10 is used:

```typescript
const passwordHash = await bcrypt.hash(dto.password, 10);
```

---

## 4. JWT Strategy & Token Lifecycle

### Token Structure

JWTs are signed with `HS256` using the `JWT_SECRET` environment variable. The payload contains:

```json
{
  "sub": "<userId>",
  "email": "user@example.com",
  "role": "Tenant",
  "tv": 0,
  "iat": 1700000000,
  "exp": 1700604800
}
```

| Field | Purpose |
|-------|---------|
| `sub` | MongoDB User `_id` — used to fetch the user on every request |
| `role` | User's role for RBAC checks |
| `tv` | Token version — used for instant revocation (see §9) |

### Token Expiry

Tokens expire after **7 days** (configured in `backend/src/auth/auth.module.ts`). There is no refresh token mechanism — the user must re-authenticate after expiry.

> If you add a refresh token system in the future, store the refresh token as a hashed value in MongoDB (same pattern as password reset tokens) and rotate on each use.

### Validation on Every Request

Every protected endpoint triggers `JwtStrategy.validate()` (`backend/src/auth/jwt.strategy.ts`). It:

1. Extracts `sub` (userId) from the payload.
2. **Fetches the user from MongoDB** (live check, not just token claims).
3. **Rejects suspended users immediately** — `isSuspended: true` returns 401.
4. **Checks token version** — if `payload.tv !== user.tokenVersion`, the token has been revoked.
5. Returns the user context (`sub`, `email`, `role`) to the request object.

This live DB check on every request is intentional — it enables server-driven security (instant suspension/revocation) at the cost of one DB read per request.

---

## 5. OTP Verification System

OTPs are used for:
- **Email verification** on signup
- **Phone verification**
- Confirming sensitive actions

### OTP Security Properties

| Property | Implementation |
|----------|---------------|
| **Not stored in plaintext** | HMAC-SHA256 hash stored: `createHmac("sha256", OTP_SECRET).update("email:{userId}:{otp}").digest("hex")` |
| **6-digit, random** | `randomInt(100000, 1000000)` — uses `crypto.randomInt`, not `Math.random` |
| **10-minute TTL** | `otpTtlMs = 10 * 60 * 1000` — expired OTPs are cleared on first access |
| **Rate-limited attempts** | Max 5 attempts; after 5 wrong guesses the OTP is invalidated |
| **Timing-safe comparison** | `timingSafeEqual()` used — prevents timing attacks |
| **Channel scoping** | Hash includes channel (`email` / `phone`) — prevents cross-channel replay |

### OTP Secret

Set `OTP_SECRET` in `.env`. If unset, it falls back to `JWT_SECRET`. The fallback to `"dev-otp-secret"` only applies in development and is logged as a warning.

---

## 6. Password Reset Flow

```
POST /api/auth/request-password-reset  (email)
  +- User looked up silently (no error if email not found — prevents enumeration)
  +- Cryptographically random 32-char hex token generated
  +- Token HASHED with HMAC-SHA256 before DB storage
  +- Reset URL with raw token emailed to user
  +- Token expires in 1 hour

POST /api/auth/reset-password  (token, newPassword)
  +- Token hashed and looked up in DB (findByResetTokenHash)
  +- Expiry checked
  +- New password bcrypt-hashed
  +- Token cleared from DB
```

### Why Tokens Are Hashed

Password reset tokens stored in the database are hashed (HMAC-SHA256) before storage. This means:
- If an attacker dumps your database, they cannot use the tokens to reset passwords.
- Only the original raw token (sent via email) can activate a reset.

---

## 7. Rate Limiting

Rate limiting is applied globally and overridden per-route for sensitive endpoints.

### Global Default

Configured in `backend/src/app.module.ts` via `ThrottlerModule`:

```
100 requests per 60 seconds per IP (global default)
```

### Per-Route Limits (Auth Endpoints)

| Endpoint | Limit |
|----------|-------|
| `POST /api/auth/login` | 10 req / 60s |
| `POST /api/auth/google` | 8 req / 60s |
| `POST /api/auth/send-email-otp` | 5 req / 60s |
| `POST /api/auth/send-phone-otp` | 5 req / 60s |
| `POST /api/auth/verification/send-email-otp` | 5 req / 60s |
| `POST /api/auth/request-password-reset` | 5 req / 60s |
| `POST /api/auth/reset-password` | 5 req / 60s |

Exceeded limits return `429 Too Many Requests`.

> **Production note**: The `ThrottlerModule` uses **in-memory storage** by default. If you scale to multiple backend instances (e.g., Docker containers behind a load balancer), counters will not be shared across instances. In that case, switch to `@nestjs/throttler-storage-redis` and add a Redis connection.

---

## 8. reCAPTCHA v3 Bot Protection

All user account creation endpoints (`POST /api/users`) require a valid reCAPTCHA v3 token. This applies to **both tenant and landlord signups**.

### Frontend

Both `tenant-signup/page.tsx` and `landlord-signup/page.tsx` load the reCAPTCHA v3 script via Next.js `<Script>`:

```tsx
<Script
  src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
  strategy="afterInteractive"
/>
```

Before submitting, they execute the challenge:

```typescript
const recaptchaToken = await grecaptcha.execute(siteKey, { action: "tenant_signup" });
// then passes recaptchaToken in the request body
```

### Backend

`UsersService.assertRecaptchaToken()` (`backend/src/users/users.service.ts`):
1. POSTs the token to Google's verification endpoint.
2. Checks `result.success` — if false, throws 400.
3. Checks `result.action` — must be `tenant_signup` or `landlord_signup` (configurable via `RECAPTCHA_EXPECTED_ACTION`).
4. Checks `result.score` — must be = 0.5 (configurable via `RECAPTCHA_MIN_SCORE`).

### Environment Variables

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc...      # Frontend (public)
RECAPTCHA_SECRET_KEY=6Lc...                 # Backend (secret, never expose)
RECAPTCHA_MIN_SCORE=0.5                     # Optional, default 0.5
RECAPTCHA_EXPECTED_ACTION=landlord_signup,tenant_signup  # Optional
```

---

## 9. Suspension & Instant Token Revocation

### Suspending a User

Set `isSuspended: true` on the user document. The next request the user makes will be rejected with `401 Account suspended`, even if their JWT has not expired.

This is checked in `JwtStrategy.validate()` on every authenticated request.

### Revoking All Tokens for a User

Each user has a `tokenVersion` field (default: `0`). JWTs are issued with a `tv` claim matching this value.

To invalidate all existing tokens for a user (e.g., after a password change, suspicious activity, or manual admin action):

```typescript
// Increment the user's tokenVersion in MongoDB
await userModel.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
```

All existing JWTs for that user will immediately start failing with `401 Token revoked` because `payload.tv (0) !== user.tokenVersion (1)`.

New JWTs issued after the increment will carry `tv: 1` and will pass validation.

> You can call `$inc: { tokenVersion: 1 }` from the admin panel, from the password reset handler, or anywhere you need to force re-login for a specific user.

---

## 10. Role-Based Access Control (RBAC)

### Backend

Two guards work together:
- `JwtAuthGuard` (`backend/src/common/guards/jwt-auth.guard.ts`) — validates the JWT and populates `req.user`.
- `RolesGuard` (`backend/src/common/guards/roles.guard.ts`) — checks `req.user.role` against the `@Roles()` decorator.

Usage pattern:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@Get("admin/users")
getAllUsers() { ... }
```

Available roles (`backend/src/common/enums.ts`): `Tenant`, `Landlord`, `Admin`, `Unassigned`.

### Frontend

`frontend/src/middleware.ts` runs on every page navigation. It:
1. Reads the `gar_session` cookie and verifies the JWT locally (without a server round-trip).
2. Redirects unauthenticated users to `/login`.
3. Enforces role-based routing (e.g., landlords can't access `/explore`, tenants can't access `/dashboard`).

> The frontend middleware is a UX guard only. **Always enforce permissions on the backend** — the frontend can be bypassed.

---

## 11. Input Validation & Sanitisation

### DTOs (Backend)

All incoming request bodies are validated via NestJS `ValidationPipe` with:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // strips unknown fields
  forbidNonWhitelisted: true, // rejects requests with unknown fields
  transform: true,
}));
```

Every DTO uses `class-validator` decorators (`@IsString()`, `@IsEmail()`, `@IsNotEmpty()`, etc.).

### NoSQL Injection Prevention

`express-mongo-sanitize` is applied globally in `backend/src/main.ts`. It strips `$` and `.` characters from request bodies and query strings, preventing MongoDB operator injection attacks.

### XSS Prevention

Helmet's `Content-Security-Policy` and `X-XSS-Protection` headers are set globally. User-generated content should be HTML-escaped before rendering (React does this by default for JSX interpolations).

---

## 12. HTTP Security Headers

`helmet` is applied in `backend/src/main.ts`:

```typescript
app.use(helmet());
```

This sets secure defaults for:

| Header | Protection Against |
|--------|--------------------|
| `Strict-Transport-Security` | Protocol downgrade attacks |
| `X-Content-Type-Options: nosniff` | MIME-type sniffing |
| `X-Frame-Options: DENY` | Clickjacking |
| `Content-Security-Policy` | XSS injection |
| `Referrer-Policy` | Information leakage via Referer header |

---

## 13. File Upload Security

Profile photo uploads (`POST /api/users/:id/photo`) are validated in `UsersService.uploadProfilePhoto()`:

- **MIME type whitelist**: Only `image/jpeg`, `image/png`, `image/webp`, `image/gif` are accepted.
- **Size limit**: Multer is configured with a maximum file size.
- Files are uploaded to **Appwrite Storage** — they are never stored on the backend server's filesystem.

---

## 14. Environment Variables & Secrets

### Backend (`.env`)

| Variable | Purpose | Required |
|----------|---------|----------|
| `JWT_SECRET` | Signs and verifies JWTs | ? |
| `MONGODB_URI` | Database connection string | ? |
| `FIREBASE_PROJECT_ID` | Firebase Admin SDK | ? |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK | ? |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK | ? |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 verification | ? |
| `OTP_SECRET` | HMAC key for OTP hashing | Recommended |
| `RESEND_API_KEY` | Transactional email | ? |
| `THROTTLE_TTL` | Rate limit window in seconds | Optional (default: 60) |
| `THROTTLE_LIMIT` | Max requests per window | Optional (default: 100) |

### Frontend (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key (public) |
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client SDK config |

### Rules

- **Never commit `.env` files** — both `.gitignore` files exclude them correctly.
- **Never expose `FIREBASE_PRIVATE_KEY` or `JWT_SECRET` to the client**.
- Rotate `JWT_SECRET` by incrementing all users' `tokenVersion` first (to invalidate existing tokens), changing the secret, then deploying.

---

## 15. Frontend Session Management

### How Sessions Work

1. After login/signup, the backend returns `{ accessToken, user }`.
2. The frontend calls `POST /api/auth/session` (a Next.js API route in `frontend/src/pages/api/auth/session.ts`), which saves the token as the `gar_session` cookie.
3. The Zustand store (`useAppStore`) also holds the token in memory for attaching to API request headers.
4. The Next.js middleware (`frontend/src/middleware.ts`) reads the cookie and validates the JWT on every page load.

### Session Expiry

When the backend returns `401` or `403`, `apiFetch()` in `frontend/src/lib/api.ts` automatically calls `POST /api/auth/session` with `DELETE` to clear the cookie and redirects the user to `/login`.

### Location Permission

Location is requested via `navigator.geolocation` after login. This is **optional** — if the user denies it, they can still use the app. Location denial is silently caught and the redirect to `/explore` or `/dashboard` proceeds normally. Location-based features (nearby listings, map view) will simply not show distance-sorted results.

---

## 16. Security Checklist for New Endpoints

When adding a new backend endpoint, go through this checklist:

- [ ] **Authentication**: Does it need `@UseGuards(JwtAuthGuard)`?
- [ ] **Authorisation**: Does it need `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`?
- [ ] **DTO validation**: Is there a DTO with `class-validator` decorators?
- [ ] **Ownership check**: If modifying a resource, does the controller verify `req.user.sub === resource.ownerId`? (e.g., OTP endpoints check `dto.userId !== req.user?.sub`)
- [ ] **Rate limiting**: For sensitive operations, add `@Throttle({ default: { limit: N, ttl: 60_000 } })`.
- [ ] **Sanitisation**: Are user-supplied strings used in MongoDB queries? Use Mongoose's typed queries (not raw string interpolation).
- [ ] **Error messages**: Do error messages avoid leaking internal details (e.g., stack traces, DB field names)?

---

## Appendix: Architecture Diagram

```
                        +-----------------------------+
                        ¦        FRONTEND (Next.js)    ¦
                        ¦                              ¦
                        ¦  Pages ? Zustand Store       ¦
                        ¦  middleware.ts (JWT verify)  ¦
                        ¦  /api/auth/session (cookie)  ¦
                        +-----------------------------+
                                     ¦ HTTPS
                        +------------?----------------+
                        ¦       BACKEND (NestJS)       ¦
                        ¦                              ¦
                        ¦  ThrottlerGuard (rate limit) ¦
                        ¦  ValidationPipe (DTO)        ¦
                        ¦  mongo-sanitize (NoSQL)      ¦
                        ¦  Helmet (HTTP headers)       ¦
                        ¦                              ¦
                        ¦  +----------------------+   ¦
                        ¦  ¦  AuthController       ¦   ¦
                        ¦  ¦  - POST /login        ¦   ¦
                        ¦  ¦  - POST /google       ¦   ¦
                        ¦  ¦  - POST /otp          ¦   ¦
                        ¦  ¦  - POST /reset        ¦   ¦
                        ¦  +----------------------+   ¦
                        ¦             ¦               ¦
                        ¦  +----------?-----------+   ¦
                        ¦  ¦  JwtStrategy          ¦   ¦
                        ¦  ¦  - DB user fetch      ¦   ¦
                        ¦  ¦  - Suspension check   ¦   ¦
                        ¦  ¦  - TokenVersion check ¦   ¦
                        ¦  +----------------------+   ¦
                        ¦             ¦               ¦
                        ¦  +----------?-----------+   ¦
                        ¦  ¦  Match Engine         ¦   ¦
                        ¦  ¦  - 5-dim scoring      ¦   ¦
                        ¦  ¦  - State machine      ¦   ¦
                        ¦  ¦  - Smart recycling    ¦   ¦
                        ¦  ¦  - Pagination         ¦   ¦
                        ¦  +----------------------+   ¦
                        +------------+----------------+
                                     ¦
              +----------------------+----------------------+
              ¦                      ¦                       ¦
   +----------?----------+  +-------?--------+  +---------?--------+
   ¦   MongoDB (Mongoose) ¦  ¦ Firebase Admin ¦  ¦  Google reCAPTCHA¦
   ¦   - Users            ¦  ¦ (token verify) ¦  ¦  (bot protection)¦
   ¦   - Properties       ¦  +----------------+  +------------------+
   ¦   - Matches          ¦
   +---------------------+
```

---

## 17. Match Algorithm & Scoring Engine

This section documents the matching algorithm used to score tenant-property compatibility, the match status state machine, and the smart recycling system.

### Key Files

| File | Purpose |
|------|---------|
| `backend/src/common/utils/match.utils.ts` | Core scoring engine — all score computations |
| `backend/src/matches/matches.service.ts` | Match CRUD, state machine, recycling logic |
| `backend/src/matches/matches.controller.ts` | REST endpoints |
| `backend/src/matches/schemas/match.schema.ts` | MongoDB schema with indexes |
| `backend/src/common/enums/index.ts` | `MatchStatus`, `DismissReason` enums |

---

### 17.1 Scoring Engine

Every match is scored across **five weighted dimensions**:

```
matchScore = preferences × 0.30
           + apartmentType × 0.20
           + location × 0.25
           + amenity × 0.10
           + affordability × 0.15
```

Weights are configurable via the `DEFAULT_MATCH_WEIGHTS` constant in `match.utils.ts`.

#### 17.1.1 Property Type Similarity

| Scenario | Score |
|----------|-------|
| Exact type match (tenant wants Apartment, property is Apartment) | **100** |
| Same similarity group (tenant wants Apartment, property is Studio) | **70** |
| Different group entirely | **20** |
| Property type unknown | **50** |

**Similarity groups** (types within a group are treated as related):

| Group | Types |
|-------|-------|
| Residential Small | Apartment, Studio, Loft |
| Residential Large | House, Bungalow, Villa |
| Multi-Unit | Duplex, Townhouse |
| Premium | Condo, Penthouse |
| Shared | SharedApartment, SharedCompound |
| Compound | SelfCompound, NonOwnerOccupied |

#### 17.1.2 Location Score

Uses the **haversine formula** to calculate the great-circle distance (in km) between the tenant's address and the property. Scored in gradient tiers relative to the tenant's `maxCommuteRadius`:

| Distance (% of max radius) | Score |
|-----------------------------|-------|
| = 25% | **100** — very close |
| = 50% | **85** |
| = 75% | **65** |
| = 100% | **40** — at the edge |
| = 150% | **20** — slightly beyond |
| > 150% | **10** — far |
| No coordinates available | **50** — neutral (no penalty) |

Default max radius: 20 km if tenant has not specified `maxCommuteRadius`.

#### 17.1.3 Amenity Overlap

Compares the tenant's `desiredAmenities` list against the property's `amenities` array:

```
amenityScore = (matching amenities / total desired amenities) × 100
```

| Scenario | Score |
|----------|-------|
| Tenant has no amenity preferences | **100** (no penalty) |
| Property lists no amenities | **30** |
| All desired amenities present | **100** |
| Partial overlap | Proportional (e.g., 3 of 5 = 60) |

#### 17.1.4 Affordability Gradient

Based on the **rent-to-income ratio** (monthly rent ÷ (annual earnings / 12 / 3)):

| Ratio of rent to affordable threshold | Score | Meaning |
|---------------------------------------|-------|---------|
| = 80% | **100** | Comfortably affordable |
| = 100% | **80** | Affordable |
| = 120% | **50** | Stretch |
| = 150% | **20** | Difficult |
| > 150% | **0** | Unaffordable |
| No income/price data | **50** | Neutral |

#### 17.1.5 Landlord Tenant-Requirement Matching

Compares landlord's `idealTenantPreferences` against the tenant's profile across: `employmentStatus`, `maritalStatus`, `vehicles`, `smokingHabits`, `drinkingHabits`, `religionPreference`, `educationLevel`, `socialHabits`, `hasChildren`. Also checks income range and pet compatibility.

Score = `(matched criteria / considered criteria) × 100`. If no requirements are set, defaults to 100%.

---

### 17.2 Match Status State Machine

Matches follow a strict state machine. Invalid transitions are rejected with `400 Bad Request`.

```
                    +-----------------+
                    ¦   TenantLiked   ¦
                    +----------------+
                       ¦      ¦   ¦
         +-------------?--+   ¦   ¦
         ¦ LandlordQualified¦   ¦   ¦
         +----------------+   ¦   ¦
            ¦                 ¦   ¦
    +-------?------+         ¦   ¦
    ¦ ChatInitiated ¦?--------+   ¦
    +--------------+              ¦
           ¦                      ¦
    +------?----------------------?--+
    ¦           Dismissed            ¦
    ¦   (Soft ? recyclable)          ¦
    ¦   (Hard ? permanent block)     ¦
    +-------------------------------+
                 ¦ recycle (Soft only)
                 ?
           TenantLiked (recycled)
```

| From | Allowed Destinations |
|------|---------------------|
| `TenantLiked` | `LandlordQualified`, `ChatInitiated`, `Dismissed` |
| `LandlordQualified` | `ChatInitiated`, `Dismissed` |
| `ChatInitiated` | `Dismissed` |
| `Dismissed` | `TenantLiked` (recycling path only) |

**Auto-qualification**: If a tenant likes a property and the `matchScore = 70`, the status is automatically set to `LandlordQualified` (skipping the landlord review step).

---

### 17.3 Smart Recycling (Loop Logic)

When a tenant runs out of new properties to swipe, dismissed listings can be recycled:

#### Dismiss Types

| Type | Enum | Behaviour |
|------|------|-----------|
| **Soft dismiss** | `DismissReason.Soft` | Recyclable after a 14-day cooldown |
| **Hard block** | `DismissReason.Hard` | Permanently excluded — never re-shown |

Default dismiss is `Soft` unless the tenant explicitly calls the hard-block endpoint.

#### Recycling Priority Queue

Recyclable matches (soft-dismissed, past cooldown) are sorted by:

1. **Tier 1**: Property was updated by the landlord after the tenant dismissed it (price drop, new photos, etc.)
2. **Tier 2**: Unchanged properties past cooldown period

Within each tier, matches are sorted by `matchScore` descending.

#### Recycling Flow

```
Tenant dismisses property ? dismissedAt = now, dismissReason = Soft
  ... 14+ days pass ...
GET /api/matches/tenant/recycled ? returns recyclable matches
  ? Tenant decides to re-like
POST /api/matches/:id/recycle ? status ? TenantLiked, recycleCount++
```

Each match tracks `recycleCount` to monitor how many times it has been re-shown.

---

### 17.4 Match Schema (MongoDB)

| Field | Type | Purpose |
|-------|------|---------|
| `tenantId` | ObjectId | Tenant who swiped |
| `propertyId` | ObjectId | Property that was swiped |
| `status` | MatchStatus | Current state (see state machine) |
| `matchScore` | Number | Composite weighted score (0–100) |
| `preferencesMatchPercentage` | Number | Landlord requirement match % |
| `apartmentPreferenceMatchPercentage` | Number | Property type match % |
| `locationScore` | Number | Geo proximity score (0–100) |
| `amenityScore` | Number | Amenity overlap score (0–100) |
| `affordabilityScore` | Number | Rent-to-income affordability (0–100) |
| `dismissedAt` | Date | When the match was dismissed |
| `dismissReason` | DismissReason | Soft (recyclable) or Hard (permanent) |
| `recycleCount` | Number | How many times this match was recycled |
| `landlordSeenAt` | Date | Last time the landlord viewed this match |

**Indexes:**

| Index | Purpose |
|-------|---------|
| `{ tenantId: 1, propertyId: 1 }` (unique) | Prevents duplicate matches; enables fast lookups |
| `{ tenantId: 1, status: 1, updatedAt: -1 }` | Tenant match listings |
| `{ propertyId: 1, status: 1, updatedAt: -1 }` | Landlord match listings |
| `{ status: 1, dismissReason: 1, dismissedAt: 1 }` | Recycling queries |

---

### 17.5 API Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `POST` | `/api/matches` | JWT | Tenant | Create/upsert a match (like or soft-dismiss) |
| `GET` | `/api/matches/tenant?page=1&limit=20` | JWT | Tenant | Paginated active matches with properties & messages |
| `GET` | `/api/matches/tenant/recycled?page=1&limit=20` | JWT | Tenant | Recyclable dismissed matches past cooldown |
| `POST` | `/api/matches/:id/recycle` | JWT | Tenant | Re-activate a soft-dismissed match |
| `POST` | `/api/matches/:id/hard-block` | JWT | Tenant | Permanently block a property |
| `PATCH` | `/api/matches/:id` | JWT | Landlord | Update match status (must own the property) |

All list endpoints support **pagination** (`?page=1&limit=20`, max 100 per page).

---

### 17.6 Database Query Optimisation

All match queries use **native ObjectId comparisons** (not `$toString`/`$expr`), which allows MongoDB to fully utilise the compound indexes defined above. This is critical for query performance at scale.

**Before** (slow — full collection scan):
```javascript
$expr: { $eq: [{ $toString: "$propertyId" }, propertyIdString] }
```

**After** (fast — uses index):
```javascript
{ propertyId: new Types.ObjectId(propertyId) }
```

---

## 18. Recent Implementation Log

This section records recent hardening and platform changes implemented in this codebase.

### 18.1 Duplicate Listing Protection (Landlord Flow)

Implemented end-to-end duplicate handling for property creation:

| Area | Change |
|------|--------|
| Schema | Added `availableUnits` (default `1`), `fingerprintHash`, `dedupeBucketId` on properties |
| DTO | Added `duplicateAction` (`increment_units` or `create_new_draft`) and `availableUnits` on create |
| Fingerprint | Added dedicated utility `backend/src/properties/utils/fingerprint.utils.ts` using SHA-256 over normalized property signals |
| Service logic | Global duplicate lookup by fingerprint in `createProperty()` |
| Same owner | First attempt returns structured `409` requiring explicit duplicate action |
| Same owner resolution | `increment_units` increments canonical listing units without creating a new record |
| Same owner alternate | `create_new_draft` creates a new draft flagged for review |
| Different owner | Creates draft, shares `dedupeBucketId`, and returns structured `409` with `ownershipType: "different_owner"` |

Structured conflict payload contract:

```json
{
  "errorCode": "DUPLICATE_LISTING",
  "ownershipType": "same_owner | different_owner",
  "message": "human readable text",
  "canonicalHint": { "actions": ["increment_units", "create_new_draft"] }
}
```

Frontend behavior:

| Ownership Type | UI Behavior |
|----------------|-------------|
| `same_owner` | Duplicate modal prompts: Increase Units or Create Draft |
| `different_owner` | Warning modal informs cross-owner collision and draft-only path |

Relevant files:
- `backend/src/properties/schemas/property.schema.ts`
- `backend/src/properties/dto/create-property.dto.ts`
- `backend/src/properties/dto/update-property.dto.ts`
- `backend/src/properties/utils/fingerprint.utils.ts`
- `backend/src/properties/properties.service.ts`
- `frontend/src/app/add-property-review/page.tsx`
- `frontend/src/store/useAppStore.ts`

### 18.2 API Error Contract Improvements

`frontend/src/lib/api.ts` now preserves structured backend error data on thrown `Error` objects:

- `error.status` (HTTP status)
- `error.data` (parsed payload)
- `error.code` (when `errorCode` is present)

This enables robust UI branching on conflict/error codes without fragile string matching.

### 18.3 Explore Deck Looping Reliability

Explore deck empty-state flow was hardened to avoid false terminal states:

1. Try server-side recycled matches
2. If unavailable, loop once from in-memory cached deck
3. Re-fetch filtered explore listings
4. Show terminal "No more listings" only when all sources are empty

Additionally, loading-state rendering now prevents a blank-looking card stage during fetch/recycle.

Relevant file:
- `frontend/src/app/explore/page.tsx`

### 18.4 Query Performance Hardening (No Redis Required)

Backend property exploration endpoints now use a short-lived in-memory query cache and lighter query paths:

| Change | Effect |
|--------|--------|
| In-memory LRU-style cache (TTL ~30s) | Reduces repeated identical read load |
| Cache invalidation on create/update/delete | Prevents stale property views after writes |
| `.lean()` query usage for read endpoints | Lowers serialization overhead |
| Field projection on explore/map reads | Reduces payload and memory pressure |
| Added compound query indexes | Improves index selection for hot filters |

Relevant files:
- `backend/src/properties/utils/query-cache.ts`
- `backend/src/properties/properties.service.ts`
- `backend/src/properties/schemas/property.schema.ts`

### 18.5 Frontend Read-Path Performance Safeguards

Added client-side performance protections for API reads:

| Change | Effect |
|--------|--------|
| In-flight GET request deduplication | Prevents duplicate concurrent requests |
| Short-lived memory GET cache (~20s) | Reduces repeat fetch latency |
| Timeout + retry wrapper for explore/map calls | Improves resilience under transient slowness |

Relevant files:
- `frontend/src/lib/api.ts`
- `frontend/src/store/useAppStore.ts`

### 18.6 Tenant Preference Filtering (State + Distance)

Tenant filtering flow now consistently supports:

- `preferredState` (e.g., Lagos, Abuja)
- `preferredDistance` (km)

Applied across onboarding/profile persistence and explore/map query construction.

Relevant files:
- `frontend/src/app/tenant-onboarding/page.tsx`
- `frontend/src/app/tenant-onboarding/review/page.tsx`
- `frontend/src/app/profile/page.tsx`
- `frontend/src/store/useAppStore.ts`
- `backend/src/properties/properties.service.ts`
- `backend/src/properties/properties.controller.ts`

### 18.7 Canonical Nigeria Location Data, Explore Privacy, and Loading UX

Location handling was tightened so state/city selection and public property display are consistent across tenant and landlord flows.

Implemented:

- Added a shared canonical Nigeria state/city dataset for frontend forms and filters
- Updated tenant onboarding and tenant profile to use the shared state list
- Updated landlord property creation to store structured `address.street`, `address.city`, and `address.state`
- Added `city` support to Explore filtering and backend property queries
- Added a safe public location label for Explore cards and stripped street-level address data from Explore/Map API responses
- Replaced Map View text-only loading with a card-style skeleton
- Refined Explore card interaction so swipe remains global, image dots remain isolated, and property details open from a dedicated `View` CTA instead of accidental whole-card taps
- Improved desktop image carousel dots for easier use

Relevant files:
- `frontend/src/lib/nigeriaLocations.ts`
- `frontend/src/app/explore/page.tsx`
- `frontend/src/app/map-view/page.tsx`
- `frontend/src/app/tenant-onboarding/page.tsx`
- `frontend/src/app/profile/page.tsx`
- `frontend/src/app/add-property-details/page.tsx`
- `frontend/src/lib/listings.ts`
- `frontend/src/store/useAppStore.ts`
- `backend/src/properties/properties.controller.ts`
- `backend/src/properties/properties.service.ts`

### 18.8 Explore Swipe Stability, Recycle Caps, and Deterministic Map Loading

Long swipe sessions were hardened to prevent deck deadlocks and card-stack corruption, and map loading placeholders were made deterministic to satisfy React purity and linting.

Implemented:

- Fixed Explore recycle lock cleanup so background recycle/load cannot leave actions permanently disabled
- Capped recycle loops (`MAX_RECYCLE_CYCLES = 2`) to avoid endless recycling while still extending long sessions
- Stabilized front-card transitions by resetting motion/lock state on top-card identity change
- Removed stale-card fallback rendering and ensured top-stack IDs are unique to prevent duplicate/stacked ghost cards
- Improved Explore skeleton card with richer, card-accurate placeholders and shimmer loading treatment
- Replaced render-time `Math.random()` usage in Map View with deterministic hash-based values for stable skeleton marker placement and similarity sorting

Relevant files:
- `frontend/src/app/explore/page.tsx`
- `frontend/src/app/map-view/page.tsx`

### 18.9 Explore Seamless Recycle Handoff

Explore recycle now starts before the visible deck is exhausted, so long swipe sessions can continue without exposing a recycle/loading skeleton between batches.

Implemented:

- Added proactive recycle prefetch when the remaining renderable queue gets low
- Updated recycled listing injection to support append-mode handoff instead of only prepending to the front of the deck
- Kept first-load skeleton behavior for true boot loading, while suppressing recycle-time skeleton flashes after cards have already rendered
- Preserved terminal empty-state behavior once recycle and fetch paths are genuinely exhausted

Verified live:

- Repeated `PASS` swipes across 33 cards no longer surfaced the recycle skeleton mid-session
- The deck remained interactive through recycle instead of entering a temporary blank/dead state during the sampled handoff window

Relevant files:
- `frontend/src/app/explore/page.tsx`
- `frontend/src/store/useAppStore.ts`

### 18.10 Explore Deck State Machine, Infinite Replay, and Match Sync

Explore now uses an explicit deck controller rather than ad hoc queue/recycle effects, and the right-swipe persistence path was tightened so visual deck progress stays in sync with backend match creation.

Implemented:

- Added a dedicated Explore deck controller with explicit phases: `boot_loading`, `ready`, `prefetching`, `swapping`, `terminal_empty`, and `error`
- Split deck orchestration into `visibleQueue` and `bufferQueue` so swaps happen atomically instead of after the visible deck drains
- Enabled infinite session replay after the first successful load, so Explore keeps cycling previously seen listings instead of reaching terminal empty during long sessions
- Kept the rendered stack visually 3-deep by sourcing the visible card stack from `visibleQueue + bufferQueue`
- Tightened swipe timing so the next card commits before the full exit animation completes
- Hardened rapid `INTERESTED` bursts with a queued mutation path and coalesced matches refresh
- Fixed a real sync bug where a card already present in local `likedIds` could advance out of Explore without firing `POST /api/matches`; right-swipes now reconcile backend save/match state even when the card is already liked locally
- Refined the Explore boot skeleton into a bounded 3-card stack placeholder that stays within the card canvas and does not cover the `PASS` / `INTERESTED` action buttons

Verified live:

- 40 consecutive left swipes completed without recycle skeleton flashes or dead blank states
- Rapid right-swipes continued advancing the deck while backend writes were serialized in the background
- A previously failing `INTERESTED` case now produced:
  - `POST /api/users/:id/saved-properties -> 201`
  - `POST /api/matches -> 201`
  - `GET /api/matches/tenant -> 200`
- The swiped listing appeared on `/matches` immediately without manual reload
- Under forced slow 3G, the loading skeleton remained constrained to the card stack area and preserved a clean visual lane for the action buttons

Relevant files:
- `frontend/src/app/explore/page.tsx`
- `frontend/src/app/explore/useExploreDeckController.ts`
- `frontend/src/store/useAppStore.ts`
