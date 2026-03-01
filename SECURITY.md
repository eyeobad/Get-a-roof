# GET A ROOF — Security Architecture & Developer Guide

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

---

## 1. Authentication Overview

GET A ROOF supports two authentication methods:

| Method | Entry Point | Used By |
|--------|-------------|---------|
| **Google OAuth via Firebase** | `POST /api/auth/google` | Tenants & Landlords (social signup/login) |
| **Email + Password** | `POST /api/auth/login` | Tenants & Landlords (manual signup/login) |

Both methods issue a **signed JWT** upon success, which the frontend stores in an `HttpOnly`-equivalent cookie (`gar_session`) via a Next.js API route and also in memory (Zustand store) for API calls.

```
User → Firebase (Google popup) → Firebase ID Token → POST /api/auth/google → JWT
User → Email + Password Form  →                    → POST /api/auth/login  → JWT
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
- `backend/src/auth/auth.service.ts` → `resolveFirebaseIdentity()` — verifies token and extracts identity
- `backend/src/auth/dto/google-login.dto.ts` — DTO requiring `firebaseIdToken`
- `frontend/src/lib/firebase.ts` — client-side Firebase SDK and token retrieval

### Common Pitfall: Private Key Format

The `FIREBASE_PRIVATE_KEY` in `.env` must be wrapped in double quotes with literal `\n` sequences:

```env
# ✅ Correct
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"

# ❌ Wrong — double-escaped, key will be corrupted at runtime
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\nMIIE...
```

`firebase-admin.ts` calls `.replace(/\\n/g, "\n")` to convert `\n` sequences into real newlines. If the key is double-escaped, this fails silently and Firebase Admin SDK throws `auth/invalid-credential` errors.

---

## 3. Email / Password Authentication

### Signup Flow

```
POST /api/users  (CreateUserDto)
  └─ reCAPTCHA token verified (all roles)
  └─ Email uniqueness checked
  └─ Password bcrypt-hashed (cost factor 10)
  └─ User saved with emailVerified: false
  └─ Signup verification token (HMAC-SHA256) generated and emailed
  └─ Returns PENDING_VERIFICATION response

→ User submits OTP from email
POST /api/auth/verification/verify-email-otp
  └─ Verifies OTP hash
  └─ Sets emailVerified: true
  └─ Issues JWT
```

### Login Flow

```
POST /api/auth/login  (LoginDto: { email, password })
  └─ User fetched by email (case-insensitive)
  └─ bcrypt.compare(password, user.loginCredentials.passwordHash)
  └─ Suspension check
  └─ JWT issued
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
  └─ User looked up silently (no error if email not found — prevents enumeration)
  └─ Cryptographically random 32-char hex token generated
  └─ Token HASHED with HMAC-SHA256 before DB storage
  └─ Reset URL with raw token emailed to user
  └─ Token expires in 1 hour

POST /api/auth/reset-password  (token, newPassword)
  └─ Token hashed and looked up in DB (findByResetTokenHash)
  └─ Expiry checked
  └─ New password bcrypt-hashed
  └─ Token cleared from DB
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
4. Checks `result.score` — must be ≥ 0.5 (configurable via `RECAPTCHA_MIN_SCORE`).

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
| `JWT_SECRET` | Signs and verifies JWTs | ✅ |
| `MONGODB_URI` | Database connection string | ✅ |
| `FIREBASE_PROJECT_ID` | Firebase Admin SDK | ✅ |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK | ✅ |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK | ✅ |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 verification | ✅ |
| `OTP_SECRET` | HMAC key for OTP hashing | Recommended |
| `RESEND_API_KEY` | Transactional email | ✅ |
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
                        ┌─────────────────────────────┐
                        │        FRONTEND (Next.js)    │
                        │                              │
                        │  Pages → Zustand Store       │
                        │  middleware.ts (JWT verify)  │
                        │  /api/auth/session (cookie)  │
                        └────────────┬────────────────┘
                                     │ HTTPS
                        ┌────────────▼────────────────┐
                        │       BACKEND (NestJS)       │
                        │                              │
                        │  ThrottlerGuard (rate limit) │
                        │  ValidationPipe (DTO)        │
                        │  mongo-sanitize (NoSQL)      │
                        │  Helmet (HTTP headers)       │
                        │                              │
                        │  ┌──────────────────────┐   │
                        │  │  AuthController       │   │
                        │  │  - POST /login        │   │
                        │  │  - POST /google       │   │
                        │  │  - POST /otp          │   │
                        │  │  - POST /reset        │   │
                        │  └──────────┬───────────┘   │
                        │             │               │
                        │  ┌──────────▼───────────┐   │
                        │  │  JwtStrategy          │   │
                        │  │  - DB user fetch      │   │
                        │  │  - Suspension check   │   │
                        │  │  - TokenVersion check │   │
                        │  └──────────┬───────────┘   │
                        └────────────┼────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                       │
   ┌──────────▼──────────┐  ┌───────▼────────┐  ┌─────────▼────────┐
   │   MongoDB (Mongoose) │  │ Firebase Admin │  │  Google reCAPTCHA│
   │   - Users            │  │ (token verify) │  │  (bot protection)│
   │   - Properties       │  └────────────────┘  └──────────────────┘
   │   - Matches          │
   └─────────────────────┘
```
